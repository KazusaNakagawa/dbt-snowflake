# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## Full Deploy Command

For a complete deployment without interactive approval, you can use:

* `npm run full-deploy` which runs `npm run build && npx cdk deploy --all --require-approval never`

**Note:** Adjust the command options as needed for your production environment.

## Run

```bash
aws stepfunctions start-execution \
    --state-machine-arn arn:aws:states:ap-northeast-1:{{ AWS ACCUNT }}:stateMachine:DBT-Snowflake-Workflow \
    --name test-$(date +%s)
```
