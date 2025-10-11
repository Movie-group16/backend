
drop table if exists groupUser;
drop table if exists groups;
drop table if exists users cascade;
drop table if exists favourites cascade;
drop table if exists reviews cascade;
drop table if exists friends cascade;


create table users (
    id serial primary key,
    username varchar(50) not null unique,
    password_hash varchar(255) not null,
    user_desc text,
    email varchar(100) not null unique
);

create table groups (
    id serial primary key,
    group_name varchar(100) not null unique,
    owner_id int not null,
    group_desc text,
    group_rules text
);

create table discussion_start (
    id serial primary key,
    group_id int not null,
    user_id int not null,
    discussion_title text,
    discussion_text text,
    likes int,
    dislikes int,
    created_at timestamp default current_timestamp
);

create table discussion_comment (
    id serial primary key,
    discussion_start_id int not null,
    user_id int not null,
    comment_text text,
    likes int,
    dislikes int,
    created_at timestamp default current_timestamp
);

create table groupUser (
    id serial primary key,
    user_id int not null,
    group_id int not null,
    is_admin boolean default false,
    status varchar(20) default 'pending',
    foreign key (user_id) references users(id),
    constraint fk_groupUser_group foreign key (group_id) references groups(id) on delete cascade,
    unique(user_id, group_id)
);

create table favourites(
    id serial primary key,
    user_id int not null,
    movie_id int not null,
    constraint fk_fav_user foreign key (user_id) references users(id) on delete cascade
);

create table reviews(
    id serial primary key,
    user_id int not null,
    movie_id int not null,
    review_text text,
    rating int check (rating >= 1 and rating <= 5),
    constraint fk_review_user foreign key (user_id) references users(id) on delete cascade
);

create table friends (
    id serial primary key,
    user_id int not null,
    friend_id int not null,
    status varchar(20) default 'pending', 
    created_at timestamp default current_timestamp,
    updated_at timestamp default current_timestamp,
    foreign key (user_id) references users(id) on delete cascade,
    foreign key (friend_id) references users(id) on delete cascade,
    unique(user_id, friend_id),
    check (user_id != friend_id) 
);

create table discussion_likes (
    id serial primary key,
    discussion_id int not null,
    user_id int not null,
    like_type varchar(10) not null check (like_type in ('like', 'dislike')),
    created_at timestamp default current_timestamp,
    foreign key (discussion_id) references discussion_start(id) on delete cascade,
    foreign key (user_id) references users(id) on delete cascade,
    unique(discussion_id, user_id) 
);
 
create table comment_likes (
    id serial primary key,
    comment_id int not null,
    user_id int not null,
    like_type varchar(10) not null check (like_type in ('like', 'dislike')),
    created_at timestamp default current_timestamp,
    foreign key (comment_id) references discussion_comment(id) on delete cascade,
    foreign key (user_id) references users(id) on delete cascade,
    unique(comment_id, user_id) 
);