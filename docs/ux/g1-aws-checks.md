# G1 — AWS and Vercel pre-deploy checks (for the user to run)

Status: **prepared 17 Nov 2026, not run.** Covers P1 to P10 of [the go-live plan](g1-go-live-plan.md).
Decision D8 A: you run these; I only read what you paste back. I never ask for AWS login, tokens or
keys, and nothing here deploys, changes a stack, or starts a model run.

Every command in sections 1 to 5 is **read-only**. Section 6 is the one write step and waits for your
separate approval at deploy time. Commands are for Git Bash (`MSYS_NO_PATHCONV=1` stops path rewriting).

## Option: a read-only profile for the agent

If you want me to run sections 1, 2 and 4 myself instead of pasting, create a separate limited
identity, never the root profile. [g1-aws-readonly-policy.json](g1-aws-readonly-policy.json) allows
only describe, list and log reads on the stack, ECS, ECR, CodeBuild, CloudFront and the backup
bucket listing. It cannot read secrets, object contents, run SSM commands, or change anything.
Create the user or role in the IAM console, attach that policy, store its keys in a named profile
on this machine (`aws configure --profile datumm-readonly`, typed by you), and tell me the profile
name. Keys never go in chat. Remove the profile when G1 ends.

## Before you start

```bash
export AWS_PROFILE=datumm AWS_REGION=ap-south-1 AWS_DEFAULT_REGION=ap-south-1 MSYS_NO_PATHCONV=1
aws sts get-caller-identity --query Arn --output text
```

- Paste only the last line of that output's shape (it should be an ARN). The repo's STATUS file says
  profile `datumm` signs in as the **root** account. These checks only read, but a limited IAM user
  or role is safer for the deploy itself (decision D8 B describes the scope).
- **Never paste:** `aws secretsmanager get-secret-value` output, a bearer token, a Clerk secret key
  (`sk_...`), `.env` contents, or Vercel secret values. Nothing below needs any of them.
- If a value looks like a key or token, replace it with `<redacted>` before pasting.

## 1. What is running now (P1, P2)

Resource names come from the stack outputs, so nothing is guessed.

```bash
S=datumm-orchestrator
aws cloudformation describe-stacks --stack-name $S \
  --query 'Stacks[0].{status:StackStatus,updated:LastUpdatedTime,outputs:Outputs[].[OutputKey,OutputValue]}'
```

```bash
CL=$(aws cloudformation describe-stacks --stack-name $S --query "Stacks[0].Outputs[?OutputKey=='EcsCluster'].OutputValue" --output text)
SV=$(aws cloudformation describe-stacks --stack-name $S --query "Stacks[0].Outputs[?OutputKey=='EcsService'].OutputValue" --output text)
aws ecs describe-services --cluster "$CL" --services "$SV" \
  --query 'services[0].{desired:desiredCount,running:runningCount,taskDef:taskDefinition,deployments:deployments[].[status,rolloutState,taskDefinition]}'
```

```bash
TD=$(aws ecs describe-services --cluster "$CL" --services "$SV" --query 'services[0].taskDefinition' --output text)
aws ecs describe-task-definition --task-definition "$TD" \
  --query 'taskDefinition.containerDefinitions[].{name:name,image:image,environment:environment,secretNames:secrets[].name}'
```

```bash
curl -s https://d2hwgmaqtyfvmj.cloudfront.net/health
```

| Paste back | What I look for |
| --- | --- |
| Stack status and outputs | `UPDATE_COMPLETE`; output names for the later steps |
| Service and task definition | 1 running; the `api` image digest; whether it is `188ebc0` or `ab89e2b` (docs disagree) |
| `environment` list (names and values) | `ALLOWED_MODELS`, `DEFAULT_MODEL` present or not (P6); `CLERK_ISSUER`, `CLERK_AUTHORIZED_PARTIES`, `ADMIN_SUBJECTS` (P9, P10). The list holds no secrets by design; redact anything that looks like one |
| `/health` | `sourceCommit` (40 characters) |

**Does the live template equal the repo template (P1):**

```bash
aws cloudformation get-template --stack-name $S --query TemplateBody --output json > /tmp/live-template.json
python - <<'EOF'
import json
a = json.load(open('/tmp/live-template.json'))
b = json.load(open('E:/Web development/PROJECTS-FULL STACK/Datumm/datumm-orchestrator/infra/orchestrator/stack.json', encoding='utf-8'))
print('templates equal:', a == b)
print('differing top-level keys:', [k for k in set(a) | set(b) if a.get(k) != b.get(k)])
EOF
```

**Stack parameters (the change set must keep all but `ImageUri`/`RepositoryArn`):**

```bash
aws cloudformation describe-stacks --stack-name $S --query 'Stacks[0].Parameters[].[ParameterKey,ParameterValue]' --output text
```

**Rollback image (P2).** Confirm the recorded rollback digest is still in ECR (expected to start with `6af54c87`):

```bash
aws ecr describe-images --repository-name datumm-opencode-builder-hosted-opencode \
  --query 'sort_by(imageDetails,&imagePushedAt)[-8:].[imageDigest,imagePushedAt,imageTags]' --output text
aws ecr describe-images --repository-name datumm-acr/datumm-orchestrator \
  --query 'sort_by(imageDetails,&imagePushedAt)[-5:].[imageDigest,imagePushedAt,imageTags]' --output text
```

## 2. Backups (P4, read-only part)

```bash
B=$(aws cloudformation describe-stacks --stack-name $S --query "Stacks[0].Outputs[?OutputKey=='BackupBucket'].OutputValue" --output text)
aws s3 ls "s3://$B/mongodump/" --human-readable | tail -8
```

Expect a daily archive near 20:30 UTC (last recorded: `20261115T052832Z`, 32.7 MB). A restore has
never been tested; that is the rehearsal in plan step B2, not something to try on production.

## 3. Database size (P5)

This runs a read-only `count` on the production host through SSM, so it executes a command there.
Run it only if you are comfortable with that; otherwise skip it and I will plan around the 11 Nov
count (18,739 documents).

```bash
H=$(aws cloudformation describe-stacks --stack-name $S --query "Stacks[0].Outputs[?OutputKey=='HostId'].OutputValue" --output text)
aws ssm send-command --instance-ids "$H" --document-name AWS-RunShellScript \
  --parameters 'commands=["docker ps --format \"{{.Names}} {{.Image}}\""]' --query Command.CommandId --output text
```

Then read the result (replace `<id>`); it lists the container names so the next command can name the Mongo one:

```bash
aws ssm get-command-invocation --command-id <id> --instance-id "$H" --query '[Status,StandardOutputContent]' --output text
```

```bash
aws ssm send-command --instance-ids "$H" --document-name AWS-RunShellScript --parameters \
 'commands=["docker exec <mongo-container-name> mongosh --quiet --eval \"db.getSiblingDB(\\\"<MongoDatabase>\\\").getCollectionNames().forEach(n=>print(n, db.getSiblingDB(\\\"<MongoDatabase>\\\")[n].estimatedDocumentCount()))\""]' \
 --query Command.CommandId --output text
```

`<MongoDatabase>` is the stack parameter of that name (section 1). If this fails (for example Mongo
needs credentials), paste the error and stop; do not try other ways in. I want the counts of `runs`,
`task_events`, `run_events`, `admin_audit` and `app_config`.

## 4. Logs: any recent errors (P1)

```bash
LG=$(aws logs describe-log-groups --log-group-name-prefix datumm-orchestrator --query 'logGroups[].logGroupName' --output text)
aws logs filter-log-events --log-group-name "$LG" --start-time $(( ($(date +%s) - 86400) * 1000 )) \
  --filter-pattern Traceback --max-items 5 --query 'events[].message' --output text | cut -c1-300
```

An empty result means no tracebacks in the last 24 hours. Paste what appears (it can include
request details; redact anything personal).

## 5. What the live site serves today (P3, P8, P9, P10) — browser, no AWS

Signed in as the admin on the **live** web site, open these in the browser (the site's own proxy
adds your session, so no token is ever copied). Paste the JSON text:

- `https://datumm-web.vercel.app/api/service/v1/config` → `models`, `defaultModel`, `defaultReasoningEffort`
- `https://datumm-web.vercel.app/api/service/v1/admin/config` → the model list, MCP URLs (redact any URL with a token), skills

The live site runs the older web build (`7495879`), which may not expose these two routes. If a
URL returns `DATUMM_PROXY_NOT_ALLOWED` (404), paste that instead and read the same values from
the live admin Agent page (model list, default model, effort, MCP servers, skills) as a screenshot
or typed list.

And in the Vercel dashboard for project `datumm-web` (names only, **never values**), tell me whether
each is set for Production and for Preview: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
`ORCHESTRATOR_URL`, `ADMIN_EMAILS`. Also tell me the first 8 characters of the publishable key
(`pk_test_` or `pk_live_`) and which Clerk instance the Production keys belong to; the local tests
used a development instance, so I need to know whether production does too (plan question Q-4).

## 6. The one write step (approval needed at deploy time, not now)

Taking a fresh dump (P4/D12) starts the host's existing backup service and writes one object to the
backup bucket. Do not run it until the deploy window is agreed:

```bash
aws ssm send-command --instance-ids "$H" --document-name AWS-RunShellScript \
  --parameters 'commands=["systemctl start datumm-mongodump.service"]'
```

Everything that changes the stack (change set, `update-stack`, image builds) comes later, as exact
commands in plan steps B1 to B4, each needing its own approval.

## What happens after you paste

I record the answers in the plan (P1 to P10 rows), flag anything that disagrees with the repo
(first: the live commit, `ab89e2b` versus `188ebc0`), update the change-set parameter list and the
rollback digest, and tell you which of the open questions (Q-1 live backend, Q-2 rollback target, Q-4 Clerk) are closed. Paste in any
order; partial answers are fine.
