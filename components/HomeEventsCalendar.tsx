"use client";

import React, { useState } from "react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { format, isSameDay } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { CalendarDays, MapPin, Zap, Tag, Flag, Clock, CalendarPlus } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type CalendarEvent = {
  id: string;
  title: string;
  type: "convoy" | "contract" | "boost" | "coupon" | "goal";
  date: Date;
  endDate?: Date;
  imageUrl?: string;
  href: string;
  description?: string;
};

export default function HomeEventsCalendar({ events }: { events: CalendarEvent[] }) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Filter events for the selected date
  const selectedEvents = date 
    ? events.filter(e => {
        const dStart = new Date(date);
        dStart.setHours(0, 0, 0, 0);
        const dEnd = new Date(date);
        dEnd.setHours(23, 59, 59, 999);

        const evStart = new Date(e.date);
        evStart.setHours(0, 0, 0, 0);

        if (e.endDate) {
          const evEnd = new Date(e.endDate);
          evEnd.setHours(23, 59, 59, 999);
          return dStart <= evEnd && dEnd >= evStart;
        }
        return isSameDay(date, evStart);
      })
    : [];

  const getEventIcon = (type: string) => {
    switch (type) {
      case "convoy": return <MapPin className="w-4 h-4 text-primary" />;
      case "boost": return <Zap className="w-4 h-4 text-amber-500" />;
      case "coupon": return <Tag className="w-4 h-4 text-green-500" />;
      case "goal": return <Flag className="w-4 h-4 text-purple-500" />;
      default: return <Clock className="w-4 h-4 text-accent-sky" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "convoy": return "border-primary/20 bg-primary/10 text-primary";
      case "boost": return "border-amber-500/20 bg-amber-500/10 text-amber-500";
      case "coupon": return "border-green-500/20 bg-green-500/10 text-green-500";
      case "goal": return "border-purple-500/20 bg-purple-500/10 text-purple-500";
      default: return "border-accent-sky/20 bg-accent-sky/10 text-accent-sky";
    }
  };

  const getDotColor = (type: string) => {
    switch (type) {
      case "convoy": return "bg-primary";
      case "boost": return "bg-amber-500";
      case "coupon": return "bg-green-500";
      case "goal": return "bg-purple-500";
      default: return "bg-accent-sky";
    }
  };

  const getGoogleCalendarUrl = (ev: CalendarEvent) => {
    const start = ev.date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = (ev.endDate || new Date(ev.date.getTime() + 60 * 60 * 1000)).toISOString().replace(/-|:|\.\d\d\d/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${start}/${end}&details=${encodeURIComponent("Lihat detail event di: https://transport.nismara.web.id" + ev.href)}`;
  };

  const getOutlookCalendarUrl = (ev: CalendarEvent) => {
    const start = ev.date.toISOString();
    const end = (ev.endDate || new Date(ev.date.getTime() + 60 * 60 * 1000)).toISOString();
    return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(ev.title)}&startdt=${encodeURIComponent(start)}&enddt=${encodeURIComponent(end)}&body=${encodeURIComponent("Lihat detail event di: https://transport.nismara.web.id" + ev.href)}`;
  };

  const isEventPassed = (ev: CalendarEvent) => {
    const now = new Date();
    return ev.endDate ? now > ev.endDate : now > ev.date;
  };

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <ScrollReveal direction="up" className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-4">
            <CalendarDays size={14} className="text-primary" /> Jadwal Kegiatan
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight leading-tight">
            Kalender <span className="text-primary">Event Komunitas</span>
          </h2>
          <p className="text-lg text-foreground/60 leading-relaxed font-medium mt-4 max-w-2xl mx-auto">
            Jangan lewatkan jadwal mabar convoy, periode double exp, hingga pencapaian misi komunitas.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto">
          {/* CALENDAR GRID */}
          <ScrollReveal direction="left" delay={0.1} className="lg:col-span-5 flex items-start justify-center lg:justify-end">
            <div className="glass-panel p-4 rounded-3xl border border-border/50 shadow-2xl bg-card/80 backdrop-blur-xl">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={id}
                className="rounded-2xl"
                components={{
                  DayButton: (props) => {
                    const d = props.day.date;
                    const dStart = new Date(d);
                    dStart.setHours(0, 0, 0, 0);
                    const dEnd = new Date(d);
                    dEnd.setHours(23, 59, 59, 999);

                    const eventsForDay = events.filter((e) => {
                      const evStart = new Date(e.date);
                      evStart.setHours(0, 0, 0, 0);
                      if (e.endDate) {
                        const evEnd = new Date(e.endDate);
                        evEnd.setHours(23, 59, 59, 999);
                        return dStart <= evEnd && dEnd >= evStart;
                      }
                      return isSameDay(d, evStart);
                    });

                    const types = Array.from(new Set(eventsForDay.map((e) => e.type)));

                    return (
                      <CalendarDayButton {...props}>
                        {d.getDate()}
                        {types.length > 0 && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                            {types.slice(0, 3).map((t) => (
                              <span key={t} className={`w-1 h-1 rounded-full ${getDotColor(t)}`} />
                            ))}
                            {types.length > 3 && <span className="w-1 h-1 rounded-full bg-muted-foreground" />}
                          </div>
                        )}
                      </CalendarDayButton>
                    );
                  },
                }}
              />
            </div>
          </ScrollReveal>

          {/* EVENTS LIST */}
          <ScrollReveal direction="right" delay={0.2} className="lg:col-span-7 flex flex-col gap-4">
            <div className="glass-panel p-6 rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl h-full min-h-[400px]">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                <h3 className="text-xl font-bold">
                  {date ? format(date, "EEEE, d MMMM yyyy", { locale: id }) : "Pilih Tanggal"}
                </h3>
                <span className="text-xs font-bold bg-muted px-3 py-1 rounded-full">
                  {selectedEvents.length} Event
                </span>
              </div>

              <div className="flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                    <CalendarDays className="w-12 h-12 mb-3 opacity-20" />
                    <p className="font-medium">Tidak ada event pada tanggal ini.</p>
                  </div>
                ) : (
                  selectedEvents.map((ev) => (
                    <div 
                      key={ev.id}
                      className="group relative flex gap-4 p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-accent hover:border-accent transition-all hover:scale-[1.02]"
                    >
                      <Link href={ev.href} className="absolute inset-0 z-0" aria-label="Lihat detail event" />
                      
                      {ev.imageUrl && (
                        <div className="hidden sm:block w-24 h-24 shrink-0 rounded-xl overflow-hidden">
                          <img src={ev.imageUrl} alt={ev.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                        </div>
                      )}
                      <div className="flex-1 flex flex-col justify-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider w-max mb-2 border ${getEventColor(ev.type)}`}>
                          {getEventIcon(ev.type)}
                          {ev.type}
                        </div>
                        <h4 className="font-bold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">{ev.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {ev.endDate ? (
                            isSameDay(ev.date, ev.endDate) ? (
                              <span>
                                {format(ev.date, "d MMM yyyy, HH:mm", { locale: id })} - {format(ev.endDate, "HH:mm", { locale: id })} WIB
                              </span>
                            ) : (
                              <span>
                                {format(ev.date, "d MMM, HH:mm", { locale: id })} WIB - {format(ev.endDate, "d MMM, HH:mm", { locale: id })} WIB
                              </span>
                            )
                          ) : (
                            <span>{format(ev.date, "d MMM yyyy, HH:mm", { locale: id })} WIB</span>
                          )}
                        </div>
                      </div>

                      {!isEventPassed(ev) && (
                        <div className="relative z-10 shrink-0 ml-auto flex items-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-8 w-8 text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                              <CalendarPlus className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(ev), '_blank')}>
                                Google Calendar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => window.open(getOutlookCalendarUrl(ev), '_blank')}>
                                Outlook Web
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
