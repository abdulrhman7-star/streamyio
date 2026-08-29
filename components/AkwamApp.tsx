"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, Play, Download, Film, Tv, ArrowRight } from 'lucide-react';

interface MediaItem {
  title: string;
  url: string;
  image: string;
  rating?: string;
  quality?: string;
}

export default function AkwamApp() {
  const [view, setView] = useState<'home' | 'search' | 'series' | 'watch'>('home');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [movies, setMovies] = useState<MediaItem[]>([]);
  const [series, setSeries] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null);
  const [episodes, setEpisodes] = useState<MediaItem[]>([]);
  const [videoLinks, setVideoLinks] = useState<any[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [moviesRes, seriesRes] = await Promise.all([
        fetch('/api/movies?page=1').then(res => res.json()),
        fetch('/api/series?page=1').then(res => res.json())
      ]);
      if (moviesRes.success) setMovies(moviesRes.data);
      if (seriesRes.success) setSeries(seriesRes.data);
    } catch (e) {
      console.error(e);
      setError('حدث خطأ أثناء جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  // تحميل الصفحة الرئيسية
  useEffect(() => {
    if (view === 'home') {
      fetchHomeData();
    }
  }, [view]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setLoading(true);
    setError('');
    setView('search');
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || 'لا توجد نتائج');
      }
    } catch (e) {
      setError('فشل البحث');
    } finally {
      setLoading(false);
    }
  };

  const handleMediaClick = async (item: MediaItem) => {
    setCurrentMedia(item);
    setError('');
    
    if (item.url.includes('/series/') || item.url.includes('series')) {
      setView('series');
      setLoading(true);
      try {
        const res = await fetch(`/api/series-episodes?url=${encodeURIComponent(item.url)}`);
        const data = await res.json();
        if (data.success) {
          setEpisodes(data.data);
        }
      } catch (e) {
        setError('فشل في جلب الحلقات');
      } finally {
        setLoading(false);
      }
    } else {
      // فيلم
      fetchVideoLinks(item.url);
    }
  };

  const fetchVideoLinks = async (url: string) => {
    setView('watch');
    setLoading(true);
    try {
      const res = await fetch(`/api/get-link?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.success) {
        setVideoLinks(data.data);
      } else {
        setError('تعذر جلب روابط المشاهدة');
      }
    } catch (e) {
      setError('حدث خطأ أثناء جلب الروابط');
    } finally {
      setLoading(false);
    }
  };

  const MediaCard = ({ item }: { item: MediaItem }) => (
    <div 
      className="bg-gray-800 rounded-lg overflow-hidden shadow-lg cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-300"
      onClick={() => handleMediaClick(item)}
    >
      <div className="relative aspect-[2/3] w-full">
        {item.image ? (
          <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <Film className="w-12 h-12 text-gray-500" />
          </div>
        )}
        {item.quality && (
          <div className="absolute top-2 right-2 bg-blue-600 text-xs px-2 py-1 rounded font-bold">
            {item.quality}
          </div>
        )}
        {item.rating && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-yellow-400 text-xs px-2 py-1 rounded font-bold">
            ⭐ {item.rating}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold truncate" title={item.title}>{item.title}</h3>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      {/* رأس الصفحة وشريط البحث */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div 
          className="text-2xl font-black text-blue-500 cursor-pointer flex items-center gap-2"
          onClick={() => { setView('home'); setQuery(''); }}
        >
          <Play className="w-8 h-8 fill-blue-500" />
          Akwam Proxy
        </div>
        
        <form onSubmit={handleSearch} className="w-full md:w-1/2 flex">
          <input 
            type="text" 
            placeholder="ابحث عن فيلم أو مسلسل..."
            className="flex-1 bg-gray-800 border-none rounded-r-full px-6 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-l-full transition-colors flex items-center justify-center">
            <Search className="w-5 h-5" />
          </button>
        </form>
      </header>

      {/* رسائل الخطأ والتحميل */}
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      )}
      
      {error && !loading && (
        <div className="bg-red-500/20 text-red-400 p-4 rounded-lg text-center font-bold my-4">
          {error}
        </div>
      )}

      {/* عرض المحتوى حسب الحالة */}
      {!loading && view === 'home' && (
        <div className="space-y-12 animate-in fade-in duration-500">
          <section>
            <div className="flex items-center gap-2 mb-6">
              <Film className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold">أحدث الأفلام</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {movies.map((m, i) => <MediaCard key={i} item={m} />)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-6">
              <Tv className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold">أحدث المسلسلات</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {series.map((s, i) => <MediaCard key={i} item={s} />)}
            </div>
          </section>
        </div>
      )}

      {!loading && view === 'search' && (
        <div className="animate-in fade-in duration-500">
          <h2 className="text-2xl font-bold mb-6">نتائج البحث عن: {query}</h2>
          {results.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {results.map((r, i) => <MediaCard key={i} item={r} />)}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">لم يتم العثور على نتائج.</p>
          )}
        </div>
      )}

      {!loading && view === 'series' && currentMedia && (
        <div className="animate-in slide-in-from-bottom-10 duration-500">
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <ArrowRight className="w-5 h-5" /> عودة
          </button>
          
          <div className="flex flex-col md:flex-row gap-8 mb-10">
            <img src={currentMedia.image} alt={currentMedia.title} className="w-64 rounded-xl shadow-2xl" referrerPolicy="no-referrer" />
            <div>
              <h1 className="text-4xl font-black mb-4">{currentMedia.title}</h1>
              <p className="text-gray-400 max-w-2xl text-lg">اختر حلقة للمشاهدة.</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-6">الحلقات</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {episodes.map((ep, i) => (
              <div 
                key={i} 
                className="bg-gray-800 p-4 rounded-lg flex justify-between items-center cursor-pointer hover:bg-gray-700 hover:scale-105 transition-all"
                onClick={() => fetchVideoLinks(ep.url)}
              >
                <span className="font-semibold">{ep.title}</span>
                <Play className="w-5 h-5 text-blue-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && view === 'watch' && currentMedia && (
        <div className="animate-in slide-in-from-bottom-10 duration-500 max-w-5xl mx-auto">
          <button onClick={() => currentMedia.url.includes('series') ? setView('series') : setView('home')} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
            <ArrowRight className="w-5 h-5" /> عودة
          </button>
          
          <h1 className="text-3xl font-bold mb-6 text-center">{currentMedia.title}</h1>
          
          {videoLinks.length > 0 ? (
            <div className="space-y-6">
              {/* مشغل الفيديو */}
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative ring-1 ring-gray-800">
                <video 
                  ref={videoRef}
                  controls 
                  autoPlay
                  className="w-full h-full"
                  src={`/api/stream?url=${encodeURIComponent(videoLinks[0].url)}`}
                  controlsList="nodownload"
                >
                  متصفحك لا يدعم مشغل الفيديو.
                </video>
              </div>
              
              {/* اختيار الجودة والتحميل */}
              <div className="bg-gray-800 p-6 rounded-xl flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <span className="text-gray-400 self-center me-2">اختر الجودة:</span>
                  {videoLinks.map((link, idx) => (
                    <button 
                      key={idx}
                      onClick={() => {
                        if (videoRef.current) {
                          videoRef.current.src = `/api/stream?url=${encodeURIComponent(link.url)}`;
                          videoRef.current.play();
                        }
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-blue-600 rounded-lg text-sm font-semibold transition-colors"
                    >
                      {link.quality}
                    </button>
                  ))}
                </div>
                
                <a 
                  href={`/api/download?url=${encodeURIComponent(videoLinks[0].url)}`}
                  download
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors"
                >
                  <Download className="w-5 h-5" />
                  تحميل
                </a>
              </div>
            </div>
          ) : (
             <div className="text-center py-20 bg-gray-800 rounded-xl">
               <p className="text-xl text-gray-400">لا توجد روابط مشاهدة متاحة حالياً.</p>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
