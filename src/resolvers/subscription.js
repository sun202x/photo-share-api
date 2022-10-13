module.exports = {
    newPhoto: {
        // context를 통해 전달받은 pusub 인스턴스를 활용하여 subscribe 한다.
        subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator('photo-added')
    },
    newUser: {
        subscribe: (parent, args, { pubsub }) => pubsub.asyncIterator('user-added')
    }
};