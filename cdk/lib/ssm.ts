import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

/**
 * Create a single SSM parameter to store dbt Snowflake configuration as JSON.
 */
export function createDbtSnowflakeSsmParameter(
  scope: Construct,
  id: string,
  parameterName: string,
  config: Record<string, string>
): ssm.SecureStringParameterAttributes {
  return new ssm.StringParameter(scope, id, {
    parameterName,
    stringValue: JSON.stringify(config),
  });
}
