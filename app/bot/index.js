const { App } = require("@slack/bolt");
const { Configuration, OpenAIApi } = require("openai");
const {
  getConversation,
  updateConversationHistory,
} = require("../common/dynamo");

const { SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN, OPENAI_API_KEY } = process.env;
const DEFAULT_MODEL = "gpt-3.5-turbo";

const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
});

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
const BOT_SYSTEM_PROMPT = "You are a helpful assistant.";

async function chatGPTReply({ channel, message, conversation }) {
  const history = conversation ? conversation.history : [];
  const model = conversation ? conversation.model : DEFAULT_MODEL;
  const prompt = { role: "user", content: message };

  const completion = await openai.createChatCompletion({
    model,
    messages: [
      { role: "system", content: BOT_SYSTEM_PROMPT },
      ...history,
      prompt,
    ],
  });

  const reply = completion.data.choices[0].message.content.trim();

  if (conversation) {
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

  if (!userMessage || !userMessage.length) {
    return;
  }

  const conversation = await getConversation(channel);
  const isConversationMode = !!conversation;
  const isMentioned = userMessage.includes(`<@${botUserId}>`);

  if (isMentioned && !isConversationMode) {
    await app.client.chat.postMessage({
      channel,
      text: "Hey there :wave: Let me take a look at this for you!",
    });
  }

  if (isMentioned || isConversationMode) {
    const mentionRegex = new RegExp(`<@${botUserId}>`, "g");
    const messageWithoutMention = userMessage.replace(mentionRegex, "").trim();

    // Only process the message and respond if there's remaining text
    if (messageWithoutMention.length > 0) {
      const reply = await chatGPTReply({
        channel,
        message: messageWithoutMention,
        conversation,
      });
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
