import * as AWS from "aws-sdk";

const TABLE_NAME = process.env.TABLE_NAME || "";
const PRIMARY_KEY = process.env.PRIMARY_KEY || "";

const RESERVED_RESPONSE = `Error: You're using AWS reserved keywords as attributes`,
  DYNAMODB_EXECUTION_ERROR = `Error: Execution update, caused a Dynamodb error, please take a look at your CloudWatch Logs.`;

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.body) {
    return buildResponse(400, {
      message: "invalid request, you are missing the parameter body",
    });
  }

  const editedItemId = event.pathParameters.id;
  if (!editedItemId) {
    return buildResponse(400, {
      message: "invalid request, you are missing the path parameter id",
    });
  }

  const editedItem: any =
    typeof event.body == "object" ? event.body : JSON.parse(event.body);
  const editedItemProperties = Object.keys(editedItem);

  if (!editedItem || editedItemProperties.length < 1) {
    return buildResponse(400, {
      message: "invalid request, no arguments provided",
    });
  }

  const firstProperty = editedItemProperties.splice(0, 1);
  const params: any = {
    TableName: TABLE_NAME,
    Key: {
      [PRIMARY_KEY]: editedItemId,
    },
    UpdateExpression: `set ${firstProperty} = :${firstProperty}`,
    ExpressionAttributeValues: {},
    ReturnValues: "UPDATED_NEW",
  };
  params.ExpressionAttributeValues[`:${firstProperty}`] =
    editedItem[`${firstProperty}`];

  editedItemProperties.forEach((property) => {
    params.UpdateExpression += `, ${property} = :${property}`;
    params.ExpressionAttributeValues[`:${property}`] = editedItem[property];
  });

  try {
    const response = await db.update(params).promise();
    const body = {
      Operation: "UPDATE",
      Message: "SUCCESS",
      UpdatedAttributes: response,
    };
    console.log(response);
    return buildResponse(200, body);
  } catch (dbError: any) {
    const errorResponse =
      dbError.code === "ValidationException" &&
      dbError.message.includes("reserved keyword")
        ? DYNAMODB_EXECUTION_ERROR
        : RESERVED_RESPONSE;
    return { statusCode: 500, body: errorResponse };
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
