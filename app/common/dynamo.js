const AWS = require("aws-sdk");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const dynamoTable = process.env.DYNAMODB_TABLE;

async function createConversation(conversation) {
  const params = {
    TableName: dynamoTable,
    Item: conversation,
  };
  try {
    await dynamoDB.put(params).promise();
  } catch (error) {
    console.error("Error creating conversation:", error);
  }
}

async function deleteConversation(channel) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
  };
  try {
    await dynamoDB.delete(params).promise();
  } catch (error) {
    console.error("Error deleting conversation:", error);
  }
}

async function getConversation(channel) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
  };
  try {
    const result = await dynamoDB.get(params).promise();
    return result.Item;
  } catch (error) {
    console.error("Error retrieving conversation:", error);
    return null;
  }
}

async function updateConversationHistory(channel, history) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
    UpdateExpression: "set history = :history, updated_at = :updated_at",
    ExpressionAttributeValues: {
      ":history": history,
      ":updated_at": new Date().toISOString(),
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDB.update(params).promise();
  } catch (error) {
    console.error("Error updating conversation history:", error);
  }
}

module.exports = {
  createConversation,
  deleteConversation,
  getConversation,
  updateConversationHistory,
};
