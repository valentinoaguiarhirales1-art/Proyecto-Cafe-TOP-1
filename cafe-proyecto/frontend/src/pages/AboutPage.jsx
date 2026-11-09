import { Coffee, Heart, Leaf, Award } from 'lucide-react';

const values = [
  { title: 'Café preparado al momento', icon: Coffee, text: 'Molemos el café y preparamos cada bebida cuando la pides.' },
  { title: 'Un espacio para todos', icon: Heart, text: 'Ven a tomar algo, reunirte con alguien o descansar un rato.' },
  { title: 'Café de origen', icon: Leaf, text: 'Nos gusta probar granos y formas distintas de preparar café.' }
];

const teamStories = [
  {
    title: 'Sonic y Shadow en la barra',
    role: 'Personajes de la galería',
    description: 'Una escena ilustrada de dos personajes que disfrutan el café a su manera.',
    image: '/images/hero-cafe.jpg',
    badge: 'Ilustración'
  },
  {
    title: 'Miles "Tails" Prower',
    role: 'Personaje de la galería',
    description: 'Tails acompaña esta escena de la cafetería. Es parte de la colección de ilustraciones.',
    image: '/images/tails-thumbsup.jpg',
    badge: 'Ilustración'
  },
  {
    title: 'Historias en la Mesa #7',
    role: 'Una escena entre amigos',
    description: 'Silver, Sonic y Shadow comparten café y helado en esta ilustración.',
    image: '/images/cafe-moments-trio.jpg',
    badge: 'Ilustración'
  },
  {
    title: 'Una noche de disfraces',
    role: 'Escena de temporada',
    description: 'Una ilustración inspirada en Halloween, con música y disfraces.',
    image: '/images/halloween-party.jpg',
    badge: 'Ilustración'
  }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="max-w-3xl mx-auto text-center mb-16 animate-fade-in">
          <p className="section-subtitle">Café Exquisito</p>
          <h1 className="section-title">Un lugar para <span className="text-cafe-caramel">disfrutar el café</span></h1>
          <p className="text-cafe-brown leading-relaxed mt-4 text-base sm:text-lg">
            Café Exquisito reúne bebidas, algo para comer y un espacio para hacer una pausa. Preparamos cada pedido
            al momento y compartimos aquí algunas escenas de la cafetería.
          </p>
        </header>

        {/* Valores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
          {values.map(({ title, icon: Icon, text }) => (
            <article key={title} className="glass-dark p-6 text-center card-cafe border border-cafe-caramel/20">
              <Icon size={30} className="text-cafe-caramel mx-auto mb-4" />
              <h2 className="font-serif text-xl text-cafe-cream mb-2">{title}</h2>
              <p className="text-cafe-brown text-sm leading-relaxed">{text}</p>
            </article>
          ))}
        </div>

        {/* Galería de Historias y Equipo */}
        <div className="text-center mb-12">
          <p className="section-subtitle flex items-center justify-center gap-2">
            Galería de la cafetería
          </p>
          <h2 className="section-title">Escenas de <span className="text-cafe-caramel">Café Exquisito</span></h2>
          <p className="text-cafe-brown max-w-xl mx-auto text-sm mt-2">
            Personajes e ilustraciones que forman parte de la galería.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {teamStories.map((story) => (
            <article key={story.title} className="card-cafe image-art-card group overflow-hidden border border-cafe-caramel/20 hover:border-cafe-caramel/50 transition-all duration-300">
              <div className="image-art-frame relative h-64 overflow-hidden bg-cafe-dark">
                <img
                  src={story.image}
                  alt={story.title}
                  className="image-art-image w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-cafe-dark/90 via-transparent to-transparent" />
                <span className="absolute top-3 left-3 bg-cafe-caramel text-cafe-dark text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                  <Award size={12} /> {story.badge}
                </span>
              </div>
              <div className="p-6">
                <p className="text-cafe-caramel text-xs font-semibold uppercase tracking-wider mb-1">{story.role}</p>
                <h3 className="font-serif text-2xl text-cafe-cream mb-2">{story.title}</h3>
                <p className="text-cafe-brown text-sm leading-relaxed">{story.description}</p>
              </div>
            </article>
          ))}
        </div>

      </div>
    </div>
  );
}
