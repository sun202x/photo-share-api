const fetch = require('node-fetch');

const findBy = (value, array, field = 'id') =>
    array[array.map(item => item[field]).indexOf(value)];

const generateFakeUsers = count =>
    fetch(`https://randomuser.me/api/?results=${count}`)
        .then(res => res.json());

const requestGithubToken = credentials =>
    fetch(
        'https://github.com/login/oauth/access_token',
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(credentials)
        }
    ).then(res => res.json())

const requestGithubUserAccount = token =>
    fetch(`https://api.github.com/user`, {
        headers: {
            Authorization: `token ${token}`
        },
    }).then(res => res.json());

const authorizeWithGithub = async credentials => {
    const { access_token } = await requestGithubToken(credentials);
    const githubUser = await requestGithubUserAccount(access_token);

    return { 
        ...githubUser, 
        access_token 
    };
}

module.exports = { 
    findBy, 
    authorizeWithGithub, 
    generateFakeUsers
};