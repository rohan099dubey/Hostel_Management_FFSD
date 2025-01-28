const form = document.querySelector('#entry');
const grid = document.querySelector('#grid');

form.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = form.children.username.value;
    const problemtext = form.children.problemtext.value;

    const h1 = document.createElement('h1');
    h1.classList = "username";

    const name = document.createElement('span');
    name.innerText = username;
    const date = document.createElement('span');
    const d = new Date();
    date.innerText = `${d.getHours()}:${d.getMinutes()}`

    h1.append(name);
    h1.append(date);

    const p = document.createElement('p');
    p.innerText = problemtext;
    p.classList = "p-3"

    const div = document.createElement('div');
    div.classList = "card";
    div.append(h1);
    div.append(p);
    grid.prepend(div);

    form.children.username.value = "";
    form.children.problemtext.value = "";

    console.log(username);
    console.log(problemtext);
})