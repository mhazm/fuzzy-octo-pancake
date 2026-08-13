"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

interface City {
  id: string;
  real_name: string;
}

interface CityComboboxProps {
  name: string;
  gameId: string;
  placeholder?: string;
  defaultValue?: string;
}

export default function CityCombobox({ 
  name, 
  gameId, 
  placeholder = "Pilih Kota", 
  defaultValue = "" 
}: CityComboboxProps) {
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [value, setValue] = useState(defaultValue);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset value if game changes, but not on initial load if there's a default
    if (!initialLoad) {
      setValue("");
      setSearch("");
    }
  }, [gameId]);

  useEffect(() => {
    const fetchCities = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/cities?gameId=${gameId}`);
        const data = await res.json();
        if (data.success) {
          setCities(data.cities);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };
    
    if (gameId) fetchCities();
  }, [gameId]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCities = cities.filter(c => 
    c.real_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input type="hidden" name={name} value={value} required />
      
      <div 
        className="flex items-center w-full bg-black/20 border border-white/10 rounded-xl overflow-hidden focus-within:border-primary transition-colors cursor-text"
        onClick={() => setOpen(true)}
      >
        <input 
          type="text"
          className="w-full bg-transparent px-4 py-2.5 text-foreground focus:outline-none"
          placeholder={placeholder}
          value={open ? search : (value || search)}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setSearch(""); // Reset search to show all options when opening
          }}
        />
        <div 
          className="px-3 flex items-center justify-center cursor-pointer text-foreground/50 hover:text-foreground border-l border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(!open);
            if (!open) setSearch("");
          }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronsUpDown className="w-4 h-4" />}
        </div>
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto p-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-foreground/50">Memuat kota...</div>
          ) : filteredCities.length === 0 ? (
            <div className="p-4 text-center text-sm text-foreground/50">Kota tidak ditemukan.</div>
          ) : (
            filteredCities.map((city) => (
              <div
                key={city.id}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                  value === city.real_name ? "bg-primary/20 text-primary font-bold" : "hover:bg-white/5 text-foreground"
                }`}
                onClick={() => {
                  setValue(city.real_name);
                  setSearch("");
                  setOpen(false);
                }}
              >
                {city.real_name}
                {value === city.real_name && <Check className="w-4 h-4" />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
