# photo-share-api
웹 앱 API 개발을 위한 GraphQL 책 - API 실습

# GraphQL Mock 서버
ApolloServer에 mocks 프로퍼티를 통해 mocking을 할 수 있다.

## 기본값 전달
```javascript
const server = new ApolloServer({
  typeDefs,
  resolvers,
  mocks: true
});
```
위 로직 처럼 `true`로 설정할 경우 스키마에 작성된 기본값이 넘어가게 된다.

## 사용자 정의 mock data

```javascript
const { ApolloServer, MockList } = require('apollo-server');
const { readFileSync } = require('fs');

const typeDefs = readFileSync('./typeDefs.graphql', 'UTF-8');
const resolvers = {};


const mocks = {
  Query: () => ({
    totalPhotos: () => 42,
    allPhotos: () => new MockList([5, 10]),
    Photo: () => ({
      name: 'sample photo',
      description: null
    })
  })
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  mocks
});

server.listen({ port: 4000 }, () =>
  console.log(`Mock Photo Share GraphQL Service running on http://localhost:4000`)
);
```
위 로직을 보면 `mock` 변수를 통해 쿼리마다 상세한 mock 데이터를 작성해서 전달해줄수 있는 것을 확인할 수 있다.  
allPhotos 쿼리를 보면 MockList 인스턴스가 전달되어 지는데, 이때 스키마에 따라 Photo 필드의 mocking data가 넘어가게 된다.