const { authorizeWithGithub, uploadStream } = require('../lib');
const fetch = require('node-fetch');
const { ObjectID } = require('mongodb');

module.exports = {
    async postPhoto(parent, args, { db, currentUser }) {
        if (!currentUser) {
            throw new Error('only an authorized user can post a photo');
        }

        const newPhoto = {
            ...args.input,
            userID: currentUser.githubLogin,
            created: new Date()
        };

        const { insertedIds } = await db.collection('photos').insert(newPhoto);
        newPhoto.id = insertedIds[0];

        const toPath = path.join(__dirname, '..', 'assets', 'photos', `${newPhoto.id}.jpg`)
        const { stream } = await args.input.file;

        await uploadStream(stream, toPath);

        // pubsub 인스턴스를 통해 publish 한다.
        // 'photo-added'를 키로 해놓은 subscription이 실행된다.
        pubsub.publish('photo-added', { newPhoto });

        return newPhoto;
    },

    async tagPhoto(parent, args, { db }) {
        await db.collection('tags')
            .replaceOne(args, args, { upsert: true });

        return db.collection('photos')
            .findOne({ _id: ObjectID(args.photoID) });
    },

    async githubAuth(parent, { code, clientID, clientSecret }, { db }) {
        let {
            message,
            access_token,
            avatar_url,
            login,
            name
        } = await authorizeWithGithub({
            client_id: clientID,
            client_secret: clientSecret,
            code
        });

        if (message) {
            throw new Error(message);
        }

        let latestUserInfo = {
            name,
            githubLogin: login,
            githubToken: access_token,
            avatar: avatar_url
        };

        const { ops:[user], result } = await db
            .collection('users')
            .replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true })

        // 정상적으로 저장되었다면 'user-added'를 publish
        result.upserted && pubsub.publish('user-added', { newUser: user })

        return { user, token: access_token };
    },

    addFakeUsers: async (parent, { count }, { db }) => {
        const randomUserApi = `https://randomuser.me/api/?results=${count}`;
        const { results } = await fetch(randomUserApi).then(res => res.json());

        const users = results.map(r => ({
            githubLogin: r.login.username,
            name: `${r.name.first} ${r.name.last}`,
            avatar: r.picture.thumbnail,
            githubToken: r.login.sha1
        }));

        await db.collection('users').insert(users);
        var newUsers = await db.collection('users')
            .find()
            .sort({ _id: -1 })
            .limit(count)
            .toArray();
        
        // 추가된 user 수 만큼 'user-added' publish
        newUsers.forEach(newUser => pubsub.publish('user-added', {newUser}));

        return users;
    },

    async fakeUserAuth(parent, { githubLogin }, { db }) {
        const user = await db.collection('users').findOne({ githubLogin });

        if (!user) {
            throw new Error(`Cannot find user with githubLogin "${githubLogin}"`);
        }

        return {
            token: user.githubToken,
            user
        };
    }
};