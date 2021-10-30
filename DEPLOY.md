# DEPLOY

> by Brecht.

- Go to https://thegraph.com/hosted-service/ and click Sign up with Github
- Once logged in go to the dashboard in thegraph (click on your github profile picture in the top right corner)
- Click Add subgraph
- Fill in the form: set a loopring icon, set the name to Protocol V3 or someting similar and also fill in the Subtitle. Set the account to Loopring (you may have to give yourself the necessary permissions like you did for me, see screenshots I posted above where to request it). The other fields should be left empty.
- Click Create Subgraph

- Fork https://github.com/juanmardefago/loopring-subgraph-v2 to the Loopring organization
- Checkout the repo locally
- Open package.json and change <subgraph-name> with the name of the newly created subgraph (e.g. loopring/protocol-v3). Leave the space before <subgraph-name>! (which looks strange but it's required).
- Now on the command line
    - yarn install
    - yarn global add @graphprotocol/graph-cli
    - graph auth https://api.thegraph.com/deploy/ <access token> (the access token can be found by going the dashbaord on thegraph and clicking on the created subgraph. At the top in the middle you'll see Access Token.
    - yarn codegen
    - yarn deploy

---

Graph owner: 0x4757D97449acA795510b9f3152C6a9019A3545c3

Our new subgraph was deployed to https://thegraph.com/explorer/subgraph/loopring/loopring

Subgraph endpoints:
Queries (HTTP):     https://api.thegraph.com/subgraphs/name/loopring/loopring
Subscriptions (WS): wss://api.thegraph.com/subgraphs/name/loopring/loopring