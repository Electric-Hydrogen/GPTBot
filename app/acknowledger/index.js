const { App, AwsLambdaReceiver } = require("@slack/bolt");
const AWS = require("aws-sdk");
const {
  updateConversationHistory,
  updateConversationState,
} = require("../common/dynamo");

const lambda = new AWS.Lambda();
const { BOT_FUNCTION_NAME, SLACK_SIGNING_SECRET, SLACK_BOT_TOKEN } =
  process.env;

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: SLACK_SIGNING_SECRET,
});

const app = new App({
  token: SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
});

app.command("/gptbot", async ({ command, ack, respond }) => {
  const channel = command.channel_id;
  const subcommand = command.text;

  if (subcommand === "start") {
    console.log("added channel", channel);
    await updateConversationState(channel, true);
    await updateConversationHistory(channel, null);
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

app.message(async ({ message, context }) => {
  const { channel, subtype } = message;
  const userMessage = message.text;
  const { botUserId } = context;

  const params = {
    FunctionName: BOT_FUNCTION_NAME,
    InvocationType: "Event", // Asynchronous invocation
    Payload: JSON.stringify({
      channel,
      subtype,
      userMessage,
      botUserId,
    }),
  };

  try {
    await lambda.invoke(params).promise();
    console.log("Lambda function invoked successfully");
  } catch (error) {
    console.error("Invocation error:", error);
  }
});

module.exports.handler = async (event, context, callback) => {
  const handler = await awsLambdaReceiver.start();
  return handler(event, context, callback);
};
