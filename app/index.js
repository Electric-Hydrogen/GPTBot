const { App, AwsLambdaReceiver } = require("@slack/bolt");
const { Configuration, OpenAIApi } = require("openai");
const {
  getConversationHistory,
  updateConversationHistory,
  getConversationState,
  updateConversationState,
} = require("./dynamo");

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

async function recordNewMessage(channel, message) {
  const history = (await getConversationHistory(channel)) || [];
  const newPrompt = { role: "user", content: message };
  const updatedHistory = [...history, newPrompt];
  await updateConversationHistory(channel, updatedHistory);
}

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

app.command("/gptbot", async ({ command, ack, respond }) => {
  const channel = command.channel_id;
  const subcommand = command.text;

  if (subcommand === "start") {
    console.log("added channel", channel);
    await updateConversationState(channel, true);
    await ack();
    await respond(
      "You have started a conversation with the ChatGPT bot in this channel."
    );
  } else if (subcommand === "stop") {
    await updateConversationState(channel, false);
    await updateConversationHistory(channel, null);
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
  const isActive = await getConversationState(channel);
  if (userMessage.includes(`<@${botUserId}>`)) {
    // Remove all occurrences of the bot's mention from the message
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
      await say(reply);
    }
  } else if (isActive) {
    console.log("only record new message");
    await recordNewMessage(channel, message);
  }
});

module.exports.handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
