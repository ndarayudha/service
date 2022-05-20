import { Construct } from "constructs";
import {
  NodejsFunction,
  NodejsFunctionProps,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from "aws-cdk-lib";
import { Architecture, Runtime, Tracing } from "aws-cdk-lib/aws-lambda";
import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";

const pathProductLambdas = join(__dirname, "..", "lambdas");
const pathPackageLockJson = join(__dirname, "..", "package-lock.json");

export interface ProductConstructProps {
  environment: string;
  minReadCapacity?: number;
  maxReadCapacity?: number;
  minWriteCapacity?: number;
  maxWriteCapacity?: number;
}

export class ProductConstruct extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string, props: ProductConstructProps) {
    super(scope, id);

    const dynamoTable = new Table(this, `${props.environment}-items-table`, {
      partitionKey: {
        name: "itemId",
        type: AttributeType.STRING,
      },
      tableName: `${props.environment}-items`,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    dynamoTable.autoScaleReadCapacity({
      minCapacity: props.minReadCapacity ?? 1,
      maxCapacity: props.maxReadCapacity ?? 1,
    });
    dynamoTable.autoScaleWriteCapacity({
      minCapacity: props.minWriteCapacity ?? 1,
      maxCapacity: props.maxWriteCapacity ?? 1,
    });
    this.table = dynamoTable;

    const nodeJsFunctionProps: NodejsFunctionProps = {
      bundling: {
        externalModules: ["aws-sdk"],
      },
      depsLockFilePath: pathPackageLockJson,
      environment: {
        PRIMARY_KEY: "itemId",
        TABLE_NAME: dynamoTable.tableName,
      },
      runtime: Runtime.NODEJS_16_X,
      architecture: Architecture.ARM_64,
      tracing: Tracing.ACTIVE,
    };

    // Create a Lambda function for each of the CRUD operations
    const getOneProduct = new NodejsFunction(this, "getOneProductFunction", {
      entry: join(pathProductLambdas, "get-one.ts"),
      ...nodeJsFunctionProps,
    });
    const getAllProducts = new NodejsFunction(this, "getAllProductsFunction", {
      entry: join(pathProductLambdas, "get-all.ts"),
      ...nodeJsFunctionProps,
    });
    const createProduct = new NodejsFunction(this, "createProductFunction", {
      entry: join(pathProductLambdas, "create.ts"),
      ...nodeJsFunctionProps,
    });
    const updateProduct = new NodejsFunction(this, "updateProductFunction", {
      entry: join(pathProductLambdas, "update-one.ts"),
      ...nodeJsFunctionProps,
    });
    const deleteProduct = new NodejsFunction(this, "deleteProductFunction", {
      entry: join(pathProductLambdas, "delete-one.ts"),
      ...nodeJsFunctionProps,
    });

    // Grant the lambda function read access to the DynamoDB table
    dynamoTable.grantReadWriteData(getOneProduct);
    dynamoTable.grantReadWriteData(getAllProducts);
    dynamoTable.grantReadWriteData(createProduct);
    dynamoTable.grantReadWriteData(updateProduct);
    dynamoTable.grantReadWriteData(deleteProduct);

    // Integrate the lambda functions with the API Gateway
    const getAllIntegration = new LambdaIntegration(getAllProducts);
    const createOneIntegration = new LambdaIntegration(createProduct);
    const getOneIntegration = new LambdaIntegration(getOneProduct);
    const updateOneIntegration = new LambdaIntegration(updateProduct);
    const deleteOneIntegration = new LambdaIntegration(deleteProduct);

    // Create an API Gateway
    const api = new RestApi(this, "ProductApi", {
      restApiName: "Product Service",
      deployOptions: {
        tracingEnabled: true,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
    });

    const products = api.root.addResource("products");
    products.addMethod("GET", getAllIntegration);
    products.addMethod("POST", createOneIntegration);

    const singleItem = products.addResource("{id}");
    singleItem.addMethod("GET", getOneIntegration);
    singleItem.addMethod("PATCH", updateOneIntegration);
    singleItem.addMethod("DELETE", deleteOneIntegration);
  }
}
