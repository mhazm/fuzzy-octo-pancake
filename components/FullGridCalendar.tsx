"use client";

import React, { useState } from "react";
import { 
  addMonths, subMonths, format, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday 
} from "date-fns";
import { id } from "date-fns/locale";
import { CalendarEvent } from "./HomeEventsCalendar";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { Button } from "./ui/button";
import Link from "next/link";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";

export default function FullGridCalendar({ events }: { events: CalendarEvent[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const getEventColor = (type: string) => {
    switch (type) {
      case "convoy": return "bg-primary/20 text-primary border-primary/30";
      case "boost": return "bg-amber-500/20 text-amber-500 border-amber-500/30";
      case "coupon": return "bg-green-500/20 text-green-500 border-green-500/30";
      case "goal": return "bg-purple-500/20 text-purple-500 border-purple-500/30";
      default: return "bg-accent-sky/20 text-accent-sky border-accent-sky/30";
    }
  };

  const getGoogleCalendarUrl = (ev: CalendarEvent) => {
    const start = ev.date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = (ev.endDate || new Date(ev.date.getTime() + 60 * 60 * 1000)).toISOString().replace(/-|:|\.\d\d\d/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${start}/${end}&details=${encodeURIComponent("Lihat detail event di: https://transport.nismara.web.id" + ev.href)}`;
  };

  const isEventPassed = (ev: CalendarEvent) => {
    const now = new Date();
    return ev.endDate ? now > ev.endDate : now > ev.date;
  };

  return (
    <div className="glass-panel border border-border/50 rounded-2xl bg-card/80 backdrop-blur-xl overflow-hidden flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-border/50 flex-wrap gap-4">
        <h2 className="text-2xl font-bold capitalize flex-1">
          {format(currentDate, "MMMM yyyy", { locale: id })}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Hari Ini</Button>
          <div className="flex items-center gap-1 bg-background/50 border border-border/50 rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-md"><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-md"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>

      {/* Grid Day Headers */}
      <div className="hidden md:grid grid-cols-7 border-b border-border/50 bg-background/30">
        {weekDays.map(day => (
          <div key={day} className="py-3 text-center text-sm font-bold text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Desktop Calendar Grid */}
      <div className="hidden md:grid grid-cols-7 auto-rows-[minmax(140px,auto)] bg-border/50 gap-[1px]">
        {calendarDays.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isCurrentDay = isToday(day);

          const dStart = new Date(day);
          dStart.setHours(0, 0, 0, 0);
          const dEnd = new Date(day);
          dEnd.setHours(23, 59, 59, 999);

          const dayEvents = events.filter((e) => {
            const evStart = new Date(e.date);
            evStart.setHours(0, 0, 0, 0);
            if (e.endDate) {
              const evEnd = new Date(e.endDate);
              evEnd.setHours(23, 59, 59, 999);
              return dStart <= evEnd && dEnd >= evStart;
            }
            return isSameDay(day, evStart);
          });

          return (
            <div 
              key={idx} 
              className={`bg-card p-2 flex flex-col gap-1 transition-colors hover:bg-card/90 ${isCurrentMonth ? "" : "opacity-40"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold flex items-center justify-center w-7 h-7 rounded-full ${isCurrentDay ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </span>
              </div>
              
              <div className="flex flex-col gap-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex-1 max-h-[120px]">
                {dayEvents.map(ev => (
                  <Link 
                    key={ev.id} 
                    href={ev.href}
                    className={`block px-2 py-1.5 rounded-md border text-xs font-semibold truncate hover:opacity-80 transition-opacity ${getEventColor(ev.type)}`}
                    title={ev.title}
                  >
                    {ev.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Timeline View */}
      <div className="md:hidden flex flex-col divide-y divide-border/50">
        {calendarDays.filter(d => isSameMonth(d, monthStart)).map((day, idx) => {
          const dStart = new Date(day);
          dStart.setHours(0, 0, 0, 0);
          const dEnd = new Date(day);
          dEnd.setHours(23, 59, 59, 999);

          const dayEvents = events.filter((e) => {
            const evStart = new Date(e.date);
            evStart.setHours(0, 0, 0, 0);
            if (e.endDate) {
              const evEnd = new Date(e.endDate);
              evEnd.setHours(23, 59, 59, 999);
              return dStart <= evEnd && dEnd >= evStart;
            }
            return isSameDay(day, evStart);
          });

          if (dayEvents.length === 0) return null;

          return (
            <div key={idx} className="p-4 flex gap-4">
              <div className="flex flex-col items-center min-w-[45px]">
                <span className="text-xs font-bold text-muted-foreground uppercase">{format(day, "EEE", { locale: id })}</span>
                <span className={`text-xl font-bold ${isToday(day) ? "text-primary" : ""}`}>{format(day, "d")}</span>
              </div>
              <div className="flex flex-col gap-3 flex-1">
                {dayEvents.map(ev => (
                  <div key={ev.id} className="relative group p-3 rounded-xl border border-border/50 bg-background/50 flex flex-col gap-2">
                    <Link href={ev.href} className="absolute inset-0 z-0" aria-label="Lihat event" />
                    <div className="flex items-start justify-between gap-2">
                      <div className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getEventColor(ev.type)}`}>
                        {ev.type}
                      </div>
                      
                      {!isEventPassed(ev) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger className="relative z-10 p-1 hover:bg-accent rounded-md text-muted-foreground">
                            <CalendarPlus className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(getGoogleCalendarUrl(ev), '_blank')}>
                              Google Calendar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <span className="font-bold text-sm leading-tight">{ev.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {events.filter(e => {
          const mStart = monthStart.getTime();
          const mEnd = monthEnd.getTime();
          const evStart = e.date.getTime();
          const evEnd = e.endDate ? e.endDate.getTime() : evStart;
          return (evStart <= mEnd && evEnd >= mStart);
        }).length === 0 && (
          <div className="p-12 flex flex-col items-center justify-center text-center text-muted-foreground">
            <span className="text-4xl mb-2 opacity-20">📅</span>
            <p className="font-medium">Tidak ada aktivitas di bulan ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
