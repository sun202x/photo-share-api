const { authorizeWithGithub } = require('../lib');
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

        await db
            .collection('users')
            .replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true });

        // 방금 변경한 항목 데이터를 가져온다.
        const user = await db
            .collection('users')
            .findOne({ githubLogin: login });

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