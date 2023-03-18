const { App, AwsLambdaReceiver } = require("@slack/bolt");
const { Configuration, OpenAIApi } = require("openai");

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
});

const { OPENAI_API_KEY } = process.env;

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const activeChannels = new Set();
const conversationHistory = new Map();

function recordNewMessage(channel, message) {
  const history = conversationHistory.get(channel) || [];
  const newPrompt = { role: "user", content: message };
  const updatedHistory = [...history, newPrompt];
  conversationHistory.set(channel, updatedHistory);
}

async function chatGPTReply(channel, message, record = false) {
  const history = conversationHistory.get(channel) || [];
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
    conversationHistory.set(channel, updatedHistory);
  }

  return reply;
}

app.command("/gptbot", async ({ command, ack, respond }) => {
  const channel = command.channel_id;
  const subcommand = command.text;

  if (subcommand === "start") {
    console.log("added channel", channel);
    activeChannels.add(channel);
    console.log("activeChannels", [...activeChannels]);
    await ack();
    await respond(
      "You have started a conversation with the ChatGPT bot in this channel."
    );
  } else if (subcommand === "stop") {
    activeChannels.delete(channel);
    conversationHistory.delete(channel);
    await ack();
    await respond(
      "You have stopped the conversation with the ChatGPT bot in this channel."
    );
  } else {
    await ack(`Invalid subcommand. Use "/GPTBot start" or "/GPTBot stop".`);
  }
});

app.message(async ({ message, say, context }) => {
  const { channel } = message;
  const userMessage = message.text;
  const { botUserId } = context;
  console.log(message);
  console.log(context);
  if (userMessage.includes(`<@${botUserId}>`)) {
    // Remove all occurrences of the bot's mention from the message
    const mentionRegex = new RegExp(`<@${botUserId}>`, "g");
    const messageWithoutMention = userMessage.replace(mentionRegex, "").trim();

    // Only process the message and respond if there's remaining text
    if (messageWithoutMention.length > 0) {
      const record = activeChannels.has(channel);
      console.log("Incoming channel", channel);
      console.log("activeChannels", [...activeChannels]);
      console.log("about to send to chat GPT message", messageWithoutMention);
      console.log("about to send to chat GPT record", record);
      const reply = await chatGPTReply(channel, messageWithoutMention, record);
      await say(reply);
    }
  } else if (activeChannels.has(channel)) {
    console.log("only record new message");
    recordNewMessage(channel, message);
  }
});

module.exports.handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
