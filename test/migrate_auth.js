#!/usr/bin/node
var mongoose = require('mongoose');
var config = require('../config');
var db = require('../api/models');
var async = require('async');
var fs = require('fs');
let oldUsersFile = fs.readFileSync('/opt/test/rady-qc/test/users.json');
let oldUsers = JSON.parse(oldUsersFile);

let oldGroupsFile = fs.readFileSync('/opt/test/rady-qc/test/groups.json');
let oldGroups = JSON.parse(oldGroupsFile);

db.init(function(err) {
    if(err) throw err; //will crash

    let new_users = {}
    async.each(oldUsers, function(oldUser, cb) {
        var new_user = new db.User({
            username: oldUser.username,
            fullname: oldUser.fullname,
            roles: oldUser.scopes.dicom,
            primary_role: 'user',
            email: oldUser.email,
            active: oldUser.active
        });

        if(new_user.roles.indexOf('admin') > -1) {
            new_user.primary_role = 'admin';
        };

        new_user.save();
        console.log(`Created new user ${new_user.username} with id ${new_user._id}`)
        new_users[new_user.email] = new_user;
        cb();
    }, function(err){
        if(err) console.log(err);
        console.log(`All done, added ${Object.keys(new_users).length} users`);

        let new_groups = {};
        async.eachSeries(oldGroups, function(oldGroup, cb_g) {
            var new_group = new db.Group({
                name: oldGroup.name,
                desc: oldGroup.desc,
                active: oldGroup.active,
                members: []
            });

            oldGroup.Members.forEach(function(member) {
                new_user = new_users[member.email];
                new_id = new_user._id;
                new_group.members.push(new_id);
                if(new_group.name.includes('Technologists') && new_user.primary_role !== 'admin') {
                    if(new_user.roles.indexOf('technologist') < 0) {
                        new_user.roles.push('technologist');
                        new_user.primary_role = 'technologist';
                        new_user.save();
                    }
                }

                if(new_group.name.includes('Researchers') && new_user.primary_role !== 'admin') {
                    if(new_user.roles.indexOf('researcher') < 0) {
                        new_user.roles.push('researcher');
                        new_user.primary_role = 'researcher';
                        new_user.save();
                    }
                }
            })

            oldGroup.Admins.forEach(function(member) {
                new_id = new_users[member.email]._id;
                if(new_group.members.indexOf(new_id) < 0) {
                    new_group.members.push(new_id);
                }
            })

            new_group.save();
            new_groups[''+oldGroup.id] = new_group;
            console.log(`Created new group ${new_group.name} with ${new_group.members.length} members`)
            cb_g();

        }, function(err) {
            if(err) console.log(err);
            console.log(`All done with groups, updating ACLs`);
            console.log(new_groups);
            db.Acl.find({}).exec(function(err, acls) {
                if(err) console.log(err);
                async.eachSeries(acls, function(acl, cb_a) {
                    console.log(`Updating ACLs for IIBIS ${acl.IIBISID}`);

                    acl.qc.groups.forEach(function (value, i) {
                        acl.qc.groups[i] = new_groups[value]._id;
                    })

                    acl.view.groups.forEach(function (value, i) {
                        acl.view.groups[i] = new_groups[value]._id;
                    })

                    acl.markModified('qc');
                    acl.markModified('view');

                    console.log(acl);

                    acl.save();
                    // let idx_qc = acl.qc.groups.indexOf(old_id);
                    // let idx_view = acl.view.groups.indexOf(old_id);
                    // console.log(idx_qc, idx_view);
                    // let changed = 0;
                    // if(idx_qc > -1) {
                    //     console.log('updating!');
                    //     acl.qc.groups[idx_qc] = new_group._id;
                    //     // acl.qc.groups.push(new_group._id);
                    //     changed = 1;
                    // }
                    //
                    // if(idx_view > -1) {
                    //     acl.view.groups[idx_view] = new_group._id;
                    //     changed = 1;
                    // }
                    //
                    // if(changed) acl.save();
                    cb_a();
                }, function(err) {
                    if(err) console.log(err);
                    console.log('updated acls')
                    return
                })
            })
        })
    })
})
