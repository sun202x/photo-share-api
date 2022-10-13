const express = require('express');
const { ApolloServer, PubSub } = require('apollo-server-express');
const { MongoClient } = require('mongodb');
const { readFileSync } = require('fs');
const expressPlayground = require('graphql-playground-middleware-express').default;
const resolvers = require('./src/resolvers');
const { createComplexityLimitRule } = require('graphql-validation-complexity');
const depthLimit = require('graphql-depth-limit');

// process.env 쓰기 위함
require('dotenv').config();

const typeDefs = readFileSync('./typeDefs.graphql', 'UTF-8');

// apollo with express 서버 설정
async function start() {
    const app = express();
    const MONGO_DB = process.env.DB_HOST;
    const pubsub = new PubSub();
    let db;

    try {
        const client = await MongoClient.connect(MONGO_DB, { useNewUrlParser: true });
        db = client.db();
    } catch (error) {
        console.log(`
            Mongo DB Host not found!
            please add DB_HOST environment variable to .env file

            exiting...
        `);
        process.exit(1);
    }

    const server = new ApolloServer({
        typeDefs,
        resolvers,
        engine: true,
        // 쿼리 응답 유효성 규칙 등록
        validationRules: [
            // 응답 데이터의 깊이를 5로 제한
            depthLimit(5),
            // 각 필드의 가중치를 더해 1000 이상이면 제한한다.
            // 필드의 가중치는 스칼라 타입이면 1을 가지고, 깊이가 깊어질때마다 * 10을 한다.
            // 특정 필드의 가중치를 원하는대로 설정할 수도 있다.
            createComplexityLimitRule(1000, {
                // 쿼리를 조회 후 onCost를 통해 현재 쿼리의 cost를 가져올 수 있다.
                onCost: cost => console.log('query cost: ', cost)
            })
        ],
        context: async ({ req }) => {
            const githubToken = req.headers.authorization;
            const currentUser = await db.collection('users').findOne({ githubToken });
            // context를 통해 pubsub 인스턴스를 전달한다.
            return { db, currentUser, pubsub };
        }
    });

    // server.applyMiddleware 호출 전 아래 로직 반드시 실행해야 한다.
    await server.start();

    server.applyMiddleware({ app });

    // express에서 사용하기 위한 apollo 서버는 해당 핸들러를 통해 playground를 사용할 수 있다.
    app.get('/playground', expressPlayground({ endpoint: '/graphql' }));

    // client를 통해 github code 정보를 가져오기 때문에 아래 로직은 필요없다.
    // app.get('/', (req, res) => {
    //     let url = `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID}&scope=user`
    //     res.end(`<a href="${url}">Sign In with Github</a>`)
    // });

    app.use(
        '/img/photos', 
        // express.static: 특정 라우팅을 통해 로컬 정적 파일을 서빙할 수 있도록 하는 미들웨어
        // - 전달받은 경로를 통해 정적 파일을 저장한다.
        express.static(path.join(__dirname, 'assets', 'photos'))
    );

    // express 어플리케이션을 전달받아서 소켓통신을 하기 위한 http server를 생성한다.
    const httpServer = createServer(app);
    // subscription을 실행시키기 위한 server 등록
    // subscription은 소켓통신을 통해 전송된다.
    server.installSubscriptionHandlers(httpServer);
    // 악의적인 요청으로 인해 서버가 멈추지 않도록 응답 시간을 제한한다.
    httpServer.timeout = 5000;

    httpServer.listen({ port: 4000 }, () =>
        console.log(`GraphQL Server running at http://localhost:4000${server.graphqlPath}`)
    );
}

start();