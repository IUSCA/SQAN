const db = require('../api/models');


var username = process.argv[2].toString();
var password = process.argv[3].toString();
var role = process.argv[4].toString();
var email = process.argv[5].toString();


let user = {
    username: username,
    fullname: username,
    password: password,
    email: email,
    roles: ['user', role],
    primary_role: role,

}


db.init(function(err) {
    let newUser = new db.User(user);

    newUser.setPassword(user.password);


    newUser.save()
        .then(finalResult => {
            db.Group
            console.log(finalResult);
        });


});
