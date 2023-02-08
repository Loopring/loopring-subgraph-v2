it's a enhance step from DEPLOY.md

deploy has 3 steps:
1 deploy to hosted service
2 deploy to studio
3 publish


1 Deploy to hosted service
https://thegraph.com/hosted-service/dashboard
follow DEPLOY.md from 'Now on the command line' to deploy(the previous are init before), use the access token of 'Loopring Protocol'
if you dont have the permission to view the access token, need ask the git admin access

Make sure the deployment id match the required

2 Deploy to studio
https://thegraph.com/studio/subgraph/loopring-zkrollup/
Rename the git folder name to loopring-zkrollup
then do:
graph deploy --studio loopring-zkrollup
(you can input the version larger than current, for example, you can input 1.0.7 when current is 1.0.6)
if it fails, you can use the command:
yarn run graph deploy --studio loopring-zkrollup --skip-migrations true

also, the deployment ID need match the requires,
if the deployment id dont match, can do it from 1 again


3 Publish
https://thegraph.com/studio/subgraph/loopring-zkrollup/

it needs ETH and GRT to publish

