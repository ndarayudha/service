import * as AWS from "aws-sdk";
import { buildResponse } from "../util/response";
import { generateId } from "../util/generateId";

const TABLE_NAME = process.env.TABLE_NAME || "";
const PRIMARY_KEY = process.env.PRIMARY_KEY || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: any = {}): Promise<any> => {
  if (!event.body) {
    return buildResponse(400, {
      message: "invalid request, you are missing the parameter body",
    });
  }
  const item =
    typeof event.body == "object" ? event.body : JSON.parse(event.body);
  item[PRIMARY_KEY] = generateId();

  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };

  try {
    await db.put(params).promise();
    return buildResponse(201, { message: "Product created", product: item });
  } catch (dbError: any) {
    console.log(dbError.e);
    return buildResponse(500, {
      message: "Create product failed",
      errorMsg: dbError.message,
      errorStack: dbError.stack,
    });
  }
};
