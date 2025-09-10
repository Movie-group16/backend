insert into users(username,password_hash,user_desc,email) 
values ('pelle', 'pellesalasana', 'jokudesc', 'test@email.com');


INSERT INTO groups(group_name, owner_id, group_desc, group_rules)
VALUES ('pellegroup',1,'pelle group description', 'you have to be pelle');


INSERT INTO groupUser(user_id, group_id, is_admin)
VALUES(1,1,TRUE);


SELECT * FROM users;
SELECT * FROM groups;
SELECT username, email, user_desc, group_name, group_desc, group_rules FROM groupUser 
INNER JOIN users ON groupUser.user_id = users.id
INNER JOIN groups ON groupUser.group_id = groups.id;