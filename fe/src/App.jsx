import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
import gsap from 'gsap';
import './App.css';

const LOGO = 'https://cdn.simpleicons.org/react/0EA5E9';
const API = 'https://backtome-api.vercel.app';

const catColor = (c='')=>{
  const s=c.toLowerCase();
  if(s.includes('ujian')) return {dot:'#DC2626'};
  if(s.includes('pr')||s.includes('tugas')) return {dot:'#EA580C'};
  if(s.includes('kompetisi')||s.includes('lomba')) return {dot:'#7C3AED'};
  if(s.includes('rapat')) return {dot:'#0891B2'};
  return {dot:'var(--accent)'};
};

export default function App(){
  const [date,setDate]=useState(new Date());
  const [schedules,setSchedules]=useState([]);
  const [showModal,setShowModal]=useState(false);
  const [selectedDateStr,setSelectedDateStr]=useState('');
  const [theme,setTheme]=useState(()=> localStorage.getItem('bt-theme') || (window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
  const [filter,setFilter]=useState('all');
  const [title,setTitle]=useState('');
  const [category,setCategory]=useState('');
  const [time,setTime]=useState('08:00');
  const [link,setLink]=useState('');
  const [chatID,setChatID]=useState('8172524004');

  // Delete flow state
  const [scheduleToDelete, setScheduleToDelete] = useState(null);

  const appRef=useRef(null);
  const headerRef=useRef(null);
  const listRef=useRef(null);
  const modalRef=useRef(null);
  const overlayRef=useRef(null);
  const confirmModalRef=useRef(null);
  const confirmOverlayRef=useRef(null);
  const logoRef=useRef(null);

  useEffect(()=>{ document.documentElement.setAttribute('data-theme',theme); localStorage.setItem('bt-theme',theme)},[theme]);

  const fetchSchedules=async()=>{
    try{ const r=await axios.get(`${API}/schedules`); if(r.data) setSchedules(r.data)}catch(e){console.error(e)}
  };
  useEffect(()=>{fetchSchedules()},[]);

  useLayoutEffect(()=>{
    const ctx=gsap.context(()=>{
      gsap.from(headerRef.current,{y:-10, opacity:0, duration:.5, ease:'power2.out'});
      gsap.from('.reveal',{y:16, opacity:0, duration:.6, stagger:.07, delay:.15, ease:'power3.out'});
      gsap.from('.cal-wrap',{y:14, opacity:0, duration:.55, delay:.3, ease:'power2.out'});
      gsap.from('.agenda-wrap',{y:14, opacity:0, duration:.55, delay:.38, ease:'power2.out'});
      gsap.fromTo(logoRef.current,{rotate:0},{rotate:360, duration:60, repeat:-1, ease:'none'});
    },appRef);
    return()=>ctx.revert();
  },[]);

  useLayoutEffect(()=>{
    if(!listRef.current) return;
    gsap.fromTo(listRef.current.querySelectorAll('.agenda-row'),
      {y:6, opacity:0},
      {y:0, opacity:1, duration:.3, stagger:.04, ease:'power2.out', overwrite:true}
    );
  },[schedules, filter]);

  useLayoutEffect(()=>{
    if(showModal){
      gsap.set(overlayRef.current,{opacity:0});
      gsap.set(modalRef.current,{y:12, opacity:0});
      gsap.to(overlayRef.current,{opacity:1, duration:.2});
      gsap.to(modalRef.current,{y:0, opacity:1, duration:.32, ease:'power3.out', delay:.04});
    }
  },[showModal]);

  useLayoutEffect(()=>{
    if(scheduleToDelete){
      gsap.set(confirmOverlayRef.current,{opacity:0});
      gsap.set(confirmModalRef.current,{y:12, opacity:0});
      gsap.to(confirmOverlayRef.current,{opacity:1, duration:.2});
      gsap.to(confirmModalRef.current,{y:0, opacity:1, duration:.32, ease:'power3.out', delay:.04});
    }
  },[scheduleToDelete]);

  const closeModal=()=>{
    if(!overlayRef.current) return setShowModal(false);
    gsap.to(modalRef.current,{y:8, opacity:0, duration:.18});
    gsap.to(overlayRef.current,{opacity:0, duration:.18, delay:.05, onComplete:()=>setShowModal(false)});
  };

  const closeConfirmModal=()=>{
    if(!confirmOverlayRef.current) return setScheduleToDelete(null);
    gsap.to(confirmModalRef.current,{y:8, opacity:0, duration:.18});
    gsap.to(confirmOverlayRef.current,{opacity:0, duration:.18, delay:.05, onComplete:()=>setScheduleToDelete(null)});
  };

  const handleDateClick=(value)=>{
    const y=value.getFullYear(), m=String(value.getMonth()+1).padStart(2,'0'), d=String(value.getDate()).padStart(2,'0');
    setSelectedDateStr(`${y}-${m}-${d}`); setShowModal(true);
  };
  
  const handleSubmit=async(e)=>{
    e.preventDefault();
    try{
      await axios.post(`${API}/schedules`,{title,category,date:selectedDateStr,time,link,chat_id:chatID});
      closeModal(); setTitle('');setCategory('');setLink('');
      fetchSchedules();
    }catch(err){ alert('Gagal menyimpan jadwal'); console.error(err)}
  };

  const handleDelete=async()=>{
    if(!scheduleToDelete) return;
    try{
      await axios.delete(`${API}/schedules/${scheduleToDelete.ID}`);
      closeConfirmModal();
      fetchSchedules();
    }catch(err){ alert('Gagal menghapus jadwal'); console.error(err)}
  };

  const uniqueCategories = [...new Set(schedules.map(s=> (s.category||'').trim()).filter(Boolean))].sort((a,b)=> a.localeCompare(b,'id'));
  const filtered = filter==='all' ? schedules : schedules.filter(s=> s.category?.toLowerCase() === filter.toLowerCase());
  const todayStr = new Date().toISOString().slice(0,10);
  const todayCount = schedules.filter(s=>s.date===todayStr).length;

  const tileContent=({date,view})=>{
    if(view!=='month') return null;
    const ds=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const dayS=schedules.filter(s=>s.date===ds);
    if(!dayS.length) return null;
    return (
      <div className="mt-[7px] flex flex-col gap-1 w-full">
        <div className="flex gap-1 flex-wrap">
          {dayS.slice(0,4).map((s,i)=>{
            const c=catColor(s.category);
            return <span key={i} className="w-[6px] h-[6px] rounded-full" style={{background:c.dot}} />
          })}
          {dayS.length>4 && <span className="text-[13px] leading-none font-mono" style={{color:'var(--text3)'}}>+{dayS.length-4}</span>}
        </div>
        <span className="text-[13px] font-medium tracking-wide px-1.5 py-0.5 rounded-full border w-fit leading-none" style={{background:'var(--surface2)', borderColor:'var(--border)', color:'var(--text2)'}}>{dayS.length}</span>
      </div>
    )
  };

  return (
    <div ref={appRef} className="min-h-screen antialiased selection:bg-[var(--accent-soft)]" style={{background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font-sans)'}}>
      {/* hairline top */}
      <div className="h-px w-full" style={{background:'var(--border)'}}/>

      {/* HEADER — brutal minimal */}
      <header ref={headerRef} className="sticky top-0 z-40 backdrop-blur-[10px] border-b" style={{background:'color-mix(in srgb, var(--bg) 86%, transparent)', borderColor:'var(--border)'}}>
        <div className="max-w-[1160px] mx-auto px-6 md:px-8 h-[56px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img ref={logoRef} src={LOGO} alt="react" width={22} height={22} className="opacity-90"/>
            <span className="text-[17px] font-semibold tracking-[-0.02em]">backtome</span>
            <span className="hidden sm:inline text-[14px] font-mono tracking-wide" style={{color:'var(--text3)'}}>— {new Date().toLocaleDateString('id-ID',{month:'long', year:'numeric'})}</span>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-5 text-[14px] font-mono" style={{color:'var(--text2)'}}>
              <a href="#kalender" className="hover:underline underline-offset-4">kalender</a>
              <a href="#agenda" className="hover:underline underline-offset-4">agenda</a>
              <span className="w-px h-4" style={{background:'var(--border)'}}/>
              <span>{schedules.length} tersimpan</span>
            </nav>
            <button onClick={()=>setTheme(t=>t==='dark'?'light':'dark')} aria-label="theme" className="w-8 h-8 rounded-full border grid place-items-center cursor-pointer transition-colors" style={{borderColor:'var(--border)', background:'var(--surface)', color:'var(--text2)'}}>
              {theme==='dark' ? (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><circle cx={12} cy={12} r={5}/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
              ):(
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
              )}
            </button>
            <button onClick={()=>handleDateClick(new Date())} className="text-[13px] font-medium px-4 h-8 rounded-full cursor-pointer border" style={{background:'var(--text)', color:'var(--bg)', borderColor:'var(--text)'}}>
              + Catat
            </button>
          </div>
        </div>
      </header>

      {/* INTRO — editorial, not card */}
      <div className="max-w-[1160px] mx-auto px-6 md:px-8 pt-10 md:pt-14 pb-8">
        <div className="grid grid-cols-12 gap-6 md:gap-8 items-end">
          <div className="col-span-12 lg:col-span-7">
            <p className="reveal font-mono text-[13.5px] tracking-[0.12em] uppercase mb-4" style={{color:'var(--text3)'}}>personal scheduler · react × telegram</p>
            <h1 className="reveal font-display text-[44px] md:text-[60px] leading-[0.92] tracking-[-0.03em] font-normal">
              Tempatku<br/>
              <span className="italic font-normal" style={{color:'var(--text2)'}}>merapikan</span> hari<br/>
              yang mudah terlupa.
            </h1>
          </div>
          <div className="col-span-12 lg:col-span-5 lg:pb-2">
            <p className="reveal text-[18px] leading-[1.65] max-w-[440px]" style={{color:'var(--text2)'}}>
              Kalender kecil untuk PR, ujian, dan janji yang sering kelewat. Klik tanggal untuk mencatat — Telegram yang mengingatkan nanti.
            </p>
            <div className="reveal flex items-center gap-3 mt-5 text-[14px] font-mono flex-wrap" style={{color:'var(--text3)'}}>
              <span>hari ini <b style={{color:'var(--text)'}} className="font-semibold">{todayCount ? `${todayCount} agenda` : 'kosong'}</b></span>
              <span className="w-1 h-1 rounded-full" style={{background:'var(--border2)'}}/>
              <a href="#kalender" className="underline underline-offset-4 decoration-[var(--border2)] hover:decoration-[var(--text3)]" style={{color:'var(--text2)'}}>loncat ke kalender</a>
            </div>
          </div>
        </div>
        <div className="mt-8 h-px w-full" style={{background:'var(--border)'}}/>
      </div>

      {/* MAIN */}
      <div className="max-w-[1160px] mx-auto px-6 md:px-8 pb-12 grid grid-cols-12 gap-8 md:gap-10 items-start">
        {/* LEFT: calendar */}
        <section id="kalender" className="col-span-12 lg:col-span-8 cal-wrap">
          <div className="flex items-baseline justify-between gap-4 mb-4">
            <h2 className="font-display text-[24px] tracking-[-0.02em]">Kalender</h2>
            <span className="font-mono text-[14px] tracking-wide" style={{color:'var(--text3)'}}>{new Date(date).toLocaleDateString('id-ID',{weekday:'long'})} · klik tanggal untuk menambah</span>
          </div>
          <div className="border rounded-[20px] p-4 md:p-6" style={{background:'var(--surface)', borderColor:'var(--border)'}}>
            <Calendar onChange={setDate} value={date} onClickDay={handleDateClick} tileContent={tileContent} locale="id-ID"/>
          </div>
          <div className="flex gap-2 mt-3 flex-wrap font-mono text-[13px] tracking-wide" style={{color:'var(--text3)'}}>
            {uniqueCategories.length ? uniqueCategories.map(k=>{
              const c=catColor(k);
              return <span key={k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border" style={{borderColor:'var(--border)', background:'var(--surface)'}}><span className="w-1.5 h-1.5 rounded-full" style={{background:c.dot}}/>{k}</span>
            }) : <span className="opacity-60">belum ada kategori</span>}
            <span className="ml-auto hidden sm:inline">bulan: {new Date(date).toLocaleDateString('id-ID',{month:'long', year:'numeric'})}</span>
          </div>
        </section>

        {/* RIGHT: agenda as editorial list, not card */}
        <aside id="agenda" className="col-span-12 lg:col-span-4 agenda-wrap lg:sticky lg:top-[72px]">
          <div className="flex items-baseline justify-between border-b pb-3" style={{borderColor:'var(--border)'}}>
            <h3 className="font-display text-[20px] tracking-[-0.02em]">Agenda</h3>
            <span className="font-mono text-[14px]" style={{color:'var(--text3)'}}>{filtered.length} catatan</span>
          </div>

          {/* filter as text links */}
          <div className="flex gap-4 mt-3 font-mono text-[14px] border-b pb-3 overflow-x-auto" style={{borderColor:'var(--border)'}}>
            {['all', ...uniqueCategories].map(f=>{
              const active = filter===f;
              return (
                <button key={f} onClick={()=>setFilter(f)} className={`whitespace-nowrap pb-0.5 border-b cursor-pointer capitalize transition-colors ${active ? 'border-[var(--text)]' : 'border-transparent'}`} style={{color: active?'var(--text)':'var(--text3)', borderColor: active?'var(--text)':'transparent'}}>
                  {f==='all'?'semua':f}
                </button>
              )
            })}
          </div>

          <div ref={listRef} className="mt-1 max-h-[560px] overflow-auto pr-1 -mr-1">
            {filtered.length===0 ? (
              <div className="py-10 text-center border-b" style={{borderColor:'var(--border)', color:'var(--text3)'}}>
                <p className="font-display text-[16px]" style={{color:'var(--text2)'}}>Belum ada catatan.</p>
                <p className="font-mono text-[13.5px] mt-1">Pilih filter lain atau klik tanggal di sebelah.</p>
              </div>
            ) : filtered.map(s=>{
              const c=catColor(s.category);
              const d = new Date(s.date);
              const day = String(d.getDate()).padStart(2,'0');
              const mon = d.toLocaleDateString('id-ID',{month:'short'}).toUpperCase();
              return (
                <div key={s.ID} className="agenda-row group grid grid-cols-[44px_1fr] gap-3 py-4 border-b relative" style={{borderColor:'var(--border)'}}>
                  <div className="text-center">
                    <div className="font-mono text-[13px] tracking-widest" style={{color:'var(--text3)'}}>{mon}</div>
                    <div className="font-display text-[22px] leading-none tracking-[-0.04em]">{day}</div>
                    <div className="font-mono text-[13px] mt-1" style={{color:'var(--text3)'}}>{s.time}</div>
                  </div>
                  <div className="min-w-0 pr-8">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{background:c.dot}}/>
                      <span className="font-mono text-[13px] tracking-[0.06em] uppercase" style={{color:'var(--text3)'}}>{s.category || 'umum'}</span>
                      {s.link && <a href={s.link} target="_blank" rel="noreferrer" className="font-mono text-[13px] underline underline-offset-4 decoration-[var(--border2)] hover:decoration-[var(--text3)]" style={{color:'var(--text2)'}}>tautan ↗</a>}
                    </div>
                    <div className="font-sans text-[16px] leading-[1.35] font-[550] tracking-[-0.01em] mt-1 line-clamp-2">{s.title}</div>
                    <div className="font-mono text-[13.5px] mt-1 truncate" style={{color:'var(--text3)'}}>{s.date} · {s.category}</div>
                  </div>
                  
                  {/* Delete button absolutely positioned on the right */}
                  <button 
                    onClick={() => setScheduleToDelete(s)}
                    aria-label="Hapus agenda"
                    className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 w-8 h-8 rounded-full border grid place-items-center cursor-pointer transition-all hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    style={{borderColor: 'var(--border)', background: 'var(--surface)'}}
                  >
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                  </button>
                </div>
              )
            })}
          </div>

          <p className="font-mono text-[13px] mt-3 flex items-center gap-1.5" style={{color:'var(--text3)'}}>
            <img src={LOGO} width={12} height={12} alt="" className="opacity-60"/> tip: klik angka tanggal untuk mencatat cepat
          </p>
        </aside>
      </div>

      <footer className="max-w-[1160px] mx-auto px-6 md:px-8 border-t py-6 flex flex-wrap justify-between gap-3 font-mono text-[13px] tracking-wide" style={{borderColor:'var(--border)', color:'var(--text3)'}}>
        <span>backtome — catatan pribadiku</span>
        <span>{new Date().getFullYear()} · serif + mono · tailwind</span>
      </footer>

      {/* CREATE MODAL */}
      {showModal && (
        <div ref={overlayRef} onClick={closeModal} className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-[8px]" style={{background:'color-mix(in srgb, var(--bg) 40%, rgba(0,0,0,.38))'}}>
          <div ref={modalRef} onClick={e=>e.stopPropagation()} className="w-[min(480px,100%)] border rounded-[20px] overflow-hidden" style={{background:'var(--surface)', borderColor:'var(--border)', boxShadow:'0 16px 48px rgba(0,0,0,.18)'}}>
            <div className="px-6 pt-6 pb-4 border-b flex items-start justify-between gap-4" style={{borderColor:'var(--border)'}}>
              <div>
                <div className="font-display text-[20px] leading-none tracking-[-0.02em]">Catatan baru</div>
                <div className="font-mono text-[13px] mt-1.5 tracking-wide" style={{color:'var(--text3)'}}>{selectedDateStr} · diingatkan via Telegram</div>
              </div>
              <button onClick={closeModal} className="w-8 h-8 rounded-full border grid place-items-center shrink-0 cursor-pointer" style={{borderColor:'var(--border)', background:'var(--surface2)', color:'var(--text2)'}}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-[13.5px] font-medium" style={{color:'var(--text2)'}}><span className="font-mono text-[13px] tracking-wide" style={{color:'var(--text3)'}}>judul</span>
                <input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="mis. Ujian Algoritma" className="w-full h-10 px-3.5 rounded-xl border outline-none text-[14.5px] focus:border-[var(--text)] transition-colors" style={{background:'var(--bg)', borderColor:'var(--border)', color:'var(--text)'}}/>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1.5 text-[13.5px] font-medium" style={{color:'var(--text2)'}}><span className="font-mono text-[13px] tracking-wide" style={{color:'var(--text3)'}}>kategori</span>
                  <input list="be-categories" value={category} onChange={e=>setCategory(e.target.value)} required placeholder={uniqueCategories[0] || "Ujian"} className="w-full h-10 px-3.5 rounded-xl border outline-none text-[14.5px]" style={{background:'var(--bg)', borderColor:'var(--border)', color:'var(--text)'}}/>
                  <datalist id="be-categories">
                    {uniqueCategories.map(c=> <option key={c} value={c} />)}
                  </datalist>
                </label>
                <label className="flex flex-col gap-1.5 text-[13.5px] font-medium" style={{color:'var(--text2)'}}><span className="font-mono text-[13px] tracking-wide" style={{color:'var(--text3)'}}>jam</span>
                  <input type="time" value={time} onChange={e=>setTime(e.target.value)} required className="w-full h-10 px-3.5 rounded-xl border outline-none text-[14.5px]" style={{background:'var(--bg)', borderColor:'var(--border)', color:'var(--text)'}}/>
                </label>
              </div>
              <label className="flex flex-col gap-1.5 text-[13.5px] font-medium" style={{color:'var(--text2)'}}><span className="font-mono text-[13px] tracking-wide" style={{color:'var(--text3)'}}>tautan <span className="normal-case font-normal">opsional</span></span>
                <input type="url" value={link} onChange={e=>setLink(e.target.value)} placeholder="https://..." className="w-full h-10 px-3.5 rounded-xl border outline-none text-[14.5px]" style={{background:'var(--bg)', borderColor:'var(--border)', color:'var(--text)'}}/>
              </label>
              <label className="flex flex-col gap-1.5 text-[13.5px] font-medium" style={{color:'var(--text2)'}}><span className="font-mono text-[13px] tracking-wide" style={{color:'var(--text3)'}}>telegram chat id</span>
                <input value={chatID} onChange={e=>setChatID(e.target.value)} required className="w-full h-10 px-3.5 rounded-xl border outline-none text-[14.5px] font-mono" style={{background:'var(--bg)', borderColor:'var(--border)', color:'var(--text)'}}/>
              </label>
              <div className="flex justify-end gap-2 mt-1">
                <button type="button" onClick={closeModal} className="h-9 px-4 rounded-full border text-[13px] font-medium cursor-pointer" style={{borderColor:'var(--border)', background:'var(--surface2)', color:'var(--text)'}}>Batal</button>
                <button type="submit" className="h-9 px-5 rounded-full text-[13px] font-semibold cursor-pointer border" style={{background:'var(--text)', color:'var(--bg)', borderColor:'var(--text)'}}>Simpan catatan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {scheduleToDelete && (
        <div ref={confirmOverlayRef} onClick={closeConfirmModal} className="fixed inset-0 z-50 grid place-items-center p-4 backdrop-blur-[8px]" style={{background:'color-mix(in srgb, var(--bg) 40%, rgba(0,0,0,.38))'}}>
          <div ref={confirmModalRef} onClick={e=>e.stopPropagation()} className="w-[min(400px,100%)] border rounded-[20px] overflow-hidden" style={{background:'var(--surface)', borderColor:'var(--border)', boxShadow:'0 16px 48px rgba(0,0,0,.18)'}}>
            <div className="p-6">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 grid place-items-center mb-4">
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h4 className="font-display text-[20px] leading-snug tracking-[-0.01em]">Hapus catatan ini?</h4>
              <p className="text-[14.5px] mt-2" style={{color:'var(--text2)'}}>
                Tindakan ini akan menghapus agenda <strong className="font-semibold text-[var(--text)]">"{scheduleToDelete.title}"</strong> secara permanen dari sistem.
              </p>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={closeConfirmModal} className="h-9 px-4 rounded-full border text-[13px] font-medium cursor-pointer" style={{borderColor:'var(--border)', background:'var(--surface2)', color:'var(--text)'}}>Batal</button>
                <button type="button" onClick={handleDelete} className="h-9 px-5 rounded-full text-[13px] font-semibold cursor-pointer border bg-red-600 text-white border-red-600 hover:bg-red-700 hover:border-red-700 transition-colors">Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
