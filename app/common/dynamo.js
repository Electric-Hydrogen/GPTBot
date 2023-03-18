const AWS = require("aws-sdk");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const dynamoTable = process.env.DYNAMODB_TABLE;

async function getConversationHistory(channel) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
  };

  try {
    const result = await dynamoDB.get(params).promise();
    return result.Item ? result.Item.conversation_history : null;
  } catch (error) {
    console.error("Error retrieving conversation history:", error);
    return null;
  }
}

async function updateConversationHistory(channel, history) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
    UpdateExpression: "set conversation_history = :history",
    ExpressionAttributeValues: {
      ":history": history,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDB.update(params).promise();
  } catch (error) {
    console.error("Error updating conversation history:", error);
  }
}

async function getConversationState(channel) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
  };

  try {
    const result = await dynamoDB.get(params).promise();
    return result.Item ? result.Item.is_active : false;
  } catch (error) {
    console.error("Error retrieving conversation state:", error);
    return false;
  }
}

async function updateConversationState(channel, isActive) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
    UpdateExpression: "set is_active = :isActive",
    ExpressionAttributeValues: {
      ":isActive": isActive,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDB.update(params).promise();
  } catch (error) {
    console.error("Error updating conversation state:", error);
  }
}

async function getConversationEngine(channel) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
  };

  try {
    const result = await dynamoDB.get(params).promise();
    return result.Item ? result.Item.engine : null;
  } catch (error) {
    console.error("Error retrieving conversation engine:", error);
    return false;
  }
}

async function updateConversationEngine(channel, engine) {
  const params = {
    TableName: dynamoTable,
    Key: {
      channel_id: channel,
    },
    UpdateExpression: "set engine = :engine",
    ExpressionAttributeValues: {
      ":engine": engine,
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    await dynamoDB.update(params).promise();
  } catch (error) {
    console.error("Error updating conversation state:", error);
  }
}

module.exports = {
  getConversationHistory,
  updateConversationHistory,
  getConversationState,
  updateConversationState,
  getConversationEngine,
  updateConversationEngine,
};
