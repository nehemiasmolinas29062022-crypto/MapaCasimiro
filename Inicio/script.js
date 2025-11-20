// Efecto de aparición al hacer scroll
const bloques = document.querySelectorAll('.bloque');

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if(entry.isIntersecting){
            entry.target.classList.add('show');
        }
    });
}, { threshold: 0.2 });

bloques.forEach(bloque => observer.observe(bloque));