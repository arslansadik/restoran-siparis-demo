fetch('menu.json')
.then(r=>r.json())
.then(data=>{
 document.getElementById('title').innerText=data.restaurantName;
 const menu=document.getElementById('menu');
 data.items.forEach(it=>{
   const c=document.createElement('div');
   c.className='card';
   c.innerHTML=`
     <img src="${it.image}">
     <h3>${it.name}</h3>
     <p>${it.desc}</p>
     <strong>${it.price} ${data.currency}</strong>
   `;
   menu.appendChild(c);
 });
});
