const { App } = require("@slack/bolt");
const { Configuration, OpenAIApi } = require("openai");
const {
  getConversationHistory,
  updateConversationHistory,
  getConversationState,
} = require("../common/dynamo");

const { SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, OPENAI_API_KEY } = process.env;

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
});

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

async function chatGPTReply(channel, message, record = false) {
  const history = (await getConversationHistory(channel)) || [];
  const prompt = { role: "user", content: message };

  const completion = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      ...history,
      prompt,
    ],
  });
  console.log("Sending", [...history, prompt]);

  const reply = completion.data.choices[0].message.content.trim();
  console.log("reply", reply);

  if (record) {
    const updatedHistory = [
      ...history,
      prompt,
      { role: "assistant", content: reply },
    ];
    console.log("Update history", updatedHistory);
    console.log("Update history channel", channel);
    await updateConversationHistory(channel, updatedHistory);
  }

  return reply;
}

async function handleNewMessage({ channel, userMessage, botUserId, subtype }) {
  console.log("handle new message");
  if (subtype === "message_deleted") {
    return;
  }
  const isActive = await getConversationState(channel);

  if (userMessage.includes(`<@${botUserId}>`) || isActive) {
    const mentionRegex = new RegExp(`<@${botUserId}>`, "g");
    const messageWithoutMention = userMessage.replace(mentionRegex, "").trim();

    // Only process the message and respond if there's remaining text
    if (messageWithoutMention.length > 0) {
      console.log("Incoming channel", channel);
      console.log("about to send to chat GPT message", messageWithoutMention);
      console.log("about to send to chat GPT record", isActive);
      const reply = await chatGPTReply(
        channel,
        messageWithoutMention,
        isActive
      );
      await app.client.chat.postMessage({
        channel,
        text: reply,
      });
    }
  }
}

module.exports.handler = async (event) => {
  console.log("Event received:", JSON.stringify(event));
  await handleNewMessage(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Event processed successfully",
    }),
  };
};
