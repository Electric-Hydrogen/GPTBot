const { App } = require("@slack/bolt");
const { Configuration, OpenAIApi } = require("openai");
const {
  getConversationHistory,
  updateConversationHistory,
  getConversationState,
  getConversationEngine,
} = require("../common/dynamo");

const { SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, OPENAI_API_KEY } = process.env;
const DEFAULT_ENGINE = "gpt-3.5-turbo";

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
  const model = record
    ? (await getConversationEngine(channel)) || DEFAULT_ENGINE
    : DEFAULT_ENGINE;

  const completion = await openai.createChatCompletion({
    model,
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      ...history,
      prompt,
    ],
  });

  const reply = completion.data.choices[0].message.content.trim();

  if (record) {
    const updatedHistory = [
      ...history,
      prompt,
      { role: "assistant", content: reply },
    ];
    await updateConversationHistory(channel, updatedHistory);
  }

  return reply;
}

async function handleNewMessage({ channel, userMessage, botUserId, subtype }) {
  console.log("Handle new message");

  if (subtype === "message_deleted") {
    return;
  }
  const isActive = await getConversationState(channel);

  if (userMessage.includes(`<@${botUserId}>`) || isActive) {
    const mentionRegex = new RegExp(`<@${botUserId}>`, "g");
    const messageWithoutMention = userMessage.replace(mentionRegex, "").trim();

    // Only process the message and respond if there's remaining text
    if (messageWithoutMention.length > 0) {
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
  await handleNewMessage(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: "Event processed successfully",
    }),
  };
};
