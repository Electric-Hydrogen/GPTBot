# GPTBot
![GPTBot Logo](assets/logo.png)

*A fully serverless (AWS Lambda, API Gateway, DynamoDB) Slack bot with GPT-4 support and full conversation mode.*

## Demo
![GPTBot Logo](assets/demo.gif)

## Features & Usage
* Support a one-off response from GPTBot when mentioning the bot (`@GPTBot`) in a channel you are both a member of.
(Make sure the Bot is added to whichever channel in which you want to talk to the Bot).
* Support full conversation with context carried over. To start a full conversation, run the command: `/gptbot start`.
To end the conversation, run the command: `/gptbot stop`.
* Support latest GPT-4 model. If you want to start a conversation with the new GPT-4 model, run the command 
`/gptbot start gpt-4`. In this mode, responses take a longer time. By default, the model used is `gpt-3.5-turbo`.
* Support collaboration mode. eg: add the Bot to a channel, start a conversation with it (`/gptbot start`): every
channel members can reply to the Bot to help refine the answers it provides.

## Installation and deployment to your AWS environment
1. `npm install`
2. `npm install -g serverless`
3. Ensure the environment variables set in `.envrc_example` are set properly. If you use [direnv](https://direnv.net/),
you can execute `cp .envrc_example .envrc` to get you started. (`SLACK_BOT_TOKEN` is obtained after creating a first 
version of the Bot in the [Slack Admin Console](https://api.slack.com/apps/) and installing it. 
The token is then listed under `OAuth & Permissions` -> `Bot User OAuth Token`). 
4. Deploy the stack: `npm run deploy`. For this command to be successful, you need to have your AWS environment variables 
properly set (Access Key Id and Security Token). Using temporary credentials via a tool like
[aws-vault](https://github.com/99designs/aws-vault) is recommended. 

## Setting up Slack
1. If you haven't already, create a new bot using this link: https://api.slack.com/apps/new
2. Our bot replies to a slash command. On the left Menu, click `Slash Commands` -> `Create new Command` and set: 
   * Command: `/gptbot`
   * Request URL: [Url of API Gateway provided by `npm run deploy`]
   * Short Description: `Start or stop a full conversation with GPTBot`
   * Usage Hint: `start|stop [engine]`
3. Our bot subscribes to Events. On the left Menu, click `Event Subscriptions`. Under Request URL, add again the link 
to API Gateway created by `npm run deploy`. Then make sure to select these events under `Subscribe to Bot Events`:
   * `app_mention`
   * `message.channels`
   * `message.groups`
   * `message.im` 
5. Our bot requires permissions. On the left Menu, click `OAuth & Permissions` -> `Scopes`.
Make sure all these scopes are added:
   * `app_mentions:read`
   * `channels:history`
   * `chat:write`
   * `commands`
   * `groups:history`
   * `im:history`
6. Our bot can talk to people via DM. On the left Menu, click `App Home` -> `Show Tabs`.
Make sure `Messages Tab` is ticked and also `Allow users to send Slash commands and messages from the messages tab`.

## What is being installed in my AWS account?
Here are the main resources this Bot deploys:
* 1 API Gateway instance
* 2 AWS Lambda functions
* 1 DynamoDB table
* 1 S3 deployment bucket (used by serverless)

To be able to subscribe to Slack events, we need an API endpoint, so we create an API Gateway instance.

Events that are sent via Slack need acknowledgement within 3 seconds, otherwise they are retried. To go around this
we are provisioning the lambda function. But calling OpenAI is taking often longer than 3 seconds. So we create two
functions:
* 1 acknowledger: this function acknowledges the event as fast as it possibly can. It then invokes asynchronously the
bot function.
* 1 bot function: this function calls OpenAI and sends the OpenAI response back to Slack.

The Bot supports full conversation mode, ie it keeps the context of what was previously exchanged to provide a new 
answer. To do that `/gptbot start` creates a record in DynamoDB for the conversation. When `/gptbot stop` is called, 
the conversation is deleted.

## Deprovision
Should you want to remove all the resources created on AWS and deprovision the bot, you could just type: 
`npm run deprovision`
