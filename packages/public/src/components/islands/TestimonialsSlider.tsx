import { useEffect, useState } from 'react';

export interface TestimonialItem {
  id: string;
  authorName: string;
  authorDescription: string;
  body: string;
}

interface Props {
  items: TestimonialItem[];
}

export default function TestimonialsSlider({ items }: Props) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [items.length]);

  if (items.length === 0) return null;

  const active = items[current]!;

  return (
    <div className="relative min-h-[200px]">
      <div className="max-w-2xl mx-auto">
        <svg className="w-10 h-10 text-primary-light/30 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11H10v10H0z" />
        </svg>
        <p className="text-xl md:text-2xl text-primary-light/90 italic leading-relaxed mb-8">
          "{active.body}"
        </p>
        <div>
          <p className="text-white font-semibold text-lg">{active.authorName}</p>
          <p className="text-primary-light/60">{active.authorDescription}</p>
        </div>
      </div>
      <div className="flex justify-center gap-2 mt-8">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === current ? 'bg-primary-light' : 'bg-primary-light/30'
            }`}
            aria-label={`Testimonial ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
