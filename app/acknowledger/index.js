const { App, AwsLambdaReceiver } = require("@slack/bolt");
const AWS = require("aws-sdk");
const {
  updateConversationHistory,
  updateConversationState,
  updateConversationEngine,
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

const validEngines = ["gpt-3.5-turbo", "gpt-4"];

app.command("/gptbot", async ({ command, ack, respond }) => {
  await ack();
  const channel = command.channel_id;

  const args = command.text.trim().split(/\s+/);
  const action = args[0];
  const engine = args[1];

  if (action === "start") {
    const selectedEngine = validEngines.includes(engine)
      ? engine
      : "gpt-3.5-turbo";
    await updateConversationState(channel, true);
    await updateConversationHistory(channel, null);
    await updateConversationEngine(channel, selectedEngine);
    await respond(
      `You have started a conversation with GPTBot in this channel using the engine '${selectedEngine}'.`
    );
  } else if (action === "stop") {
    await updateConversationState(channel, false);
    await updateConversationHistory(channel, null);
    await respond(
      "You have stopped the conversation with GPTBot in this channel."
    );
  } else {
    await respond(
      `Invalid subcommand. Use "/GPTBot start [engine]" or "/GPTBot stop".`
    );
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
