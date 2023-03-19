# GPTBot
A fully serverless (AWS Lambda, API Gateway, DynamoDB) Slack bot which supports GPT-4 and full conversation mode.

## Installation and deployment to your AWS environment
* `npm install`
* `npm install -g serverless`
* `npm run deploy`

## Usage
To get a one-off response from GPTBot, just mention the bot in the channel you are both a member of.
(Make sure the Bot is added to whichever channel in which you want to talk to the Bot).

To start a full conversation, run the command: `/gptbot start`.

To end the conversation, run the command: `/gptbot stop`.

If you want to start a conversation with the new GPT-4 model, run the command: `/gptbot start gpt-4`.
In this mode, responses take a longer time. By default, the model used is `gpt-3.5-turbo`.
