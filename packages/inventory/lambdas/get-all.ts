import * as AWS from "aws-sdk";

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (): Promise<any> => {
  const params = {
    TableName: TABLE_NAME,
  };

  try {
    const response = await db.scan(params).promise();
    return buildResponse(200, {items: response.Items});
  } catch (dbError) {
    return { statusCode: 500, body: JSON.stringify(dbError) };
  }
};

function buildResponse(statusCode: number, body: Object) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
