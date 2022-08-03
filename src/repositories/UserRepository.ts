

export default class UserRepository
{
    users = {};

    constructor() {

    }

    getAll()
    {
        return this.users;
    }

    getBySocketId(socketId)
    {
        if(typeof this.users[socketId] === 'undefined') {
            return null;
        }

        return this.users[socketId];
    }

    getByUserId(userId)
    {
        for(let iU in this.users) {
            const user = this.users[iU];
            if(user.userId === userId) {
                return user;
            }
        }

        return null;
    }

    setAll(users)
    {
        for(let uI in users) {
            const user = users[uI];

            this.users[user.socketId] = user;
        }
    }

    update(socketId, userId, name, email)
    {
        if(typeof this.users[socketId] === 'undefined') {
            this.users[socketId] = {};
        }

        this.users[socketId] = {
            userId,
            socketId,
            name,
            email
        };

        return true;
    }

    remove(socketId)
    {
        let newUsers = {};
        for(let uI in this.users) {
            if(this.users[uI].socketId == socketId) {
                continue;
            }

            newUsers[uI] = this.users[uI];
        }

        this.users = newUsers;

        return true;
    }
}