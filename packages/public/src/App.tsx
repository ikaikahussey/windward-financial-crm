import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Expertise from './pages/Expertise';
import QualityCommitment from './pages/QualityCommitment';
import Contact from './pages/Contact';
import Schedule from './pages/Schedule';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Calculator from './pages/Calculator';
import Enroll from './pages/Enroll';
import NationalLifeTransition from './pages/NationalLifeTransition';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Resources from './pages/Resources';
import Section125 from './pages/Section125';
import Section125Webinar from './pages/Section125Webinar';
import Section125Download from './pages/Section125Download';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/expertise" element={<Expertise />} />
          <Route path="/quality-commitment" element={<QualityCommitment />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/schedule-an-appointment" element={<Schedule />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/enroll" element={<Enroll />} />
          <Route path="/national-life-transition" element={<NationalLifeTransition />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/section-125" element={<Section125 />} />
          <Route path="/section-125/webinar" element={<Section125Webinar />} />
          <Route path="/section-125/download" element={<Section125Download />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
