
drop table if exists groupUser;
drop table if exists groups;
drop table if exists users cascade;
drop table if exists favourites cascade;
drop table if exists reviews cascade;



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

create table groupUser (
    id serial primary key,
    user_id int not null,
    group_id int not null,
    is_admin boolean default false,
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