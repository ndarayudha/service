import { Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ProductConstruct } from "../packages/inventory/construct/product-construct";
import { AuthConstruct } from "../packages/auth/construct/auth-construct";

export class ProductStack extends Stack {
  constructor(construct: Construct, id: string) {
    super(construct, id);

    new ProductConstruct(this, 'ProductConstruct', {
      environment: 'dev'
    });

    new AuthConstruct(this, 'DevAuthConstruct');
  }
}
