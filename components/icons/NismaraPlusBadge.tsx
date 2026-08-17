import React, { useMemo } from 'react';

interface NismaraPlusBadgeProps {
  className?: string;
  startedAt?: string | Date | null;
}

const getTierDetails = (startedAt?: string | Date | null) => {
  let months = 0;
  let formattedDate = "Unknown";
  
  if (startedAt) {
    const start = new Date(startedAt);
    const now = new Date();
    months = (now.getFullYear() - start.getFullYear()) * 12;
    months -= start.getMonth();
    months += now.getMonth();
    months = months <= 0 ? 0 : months;

    formattedDate = start.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  if (months < 3) {
    return {
      name: "Nismara+ Newbie",
      color: "#cd7f32",
      glow: "rgba(205,127,50,0.5)",
      bgGlow: "bg-[#cd7f32]/50",
      date: formattedDate
    };
  } else if (months < 6) {
    return {
      name: "Nismara+ Supporter",
      color: "#c0c0c0",
      glow: "rgba(192,192,192,0.5)",
      bgGlow: "bg-[#c0c0c0]/50",
      date: formattedDate
    };
  } else if (months < 12) {
    return {
      name: "Nismara+ Veteran",
      color: "#facc15", // yellow-400
      glow: "rgba(250,204,21,0.5)",
      bgGlow: "bg-yellow-400/50",
      date: formattedDate
    };
  } else {
    return {
      name: "Nismara+ Legend",
      color: "#50c878", // emerald
      glow: "rgba(80,200,120,0.5)",
      bgGlow: "bg-[#50c878]/50",
      date: formattedDate
    };
  }
};

export default function NismaraPlusBadge({ className = "w-4 h-4", startedAt }: NismaraPlusBadgeProps) {
  const tier = useMemo(() => getTierDetails(startedAt), [startedAt]);

  const BadgeSVG = ({ className: svgClassName }: { className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 438" 
      className={svgClassName}
      style={{
        fill: tier.color,
        filter: `drop-shadow(0 0 4px ${tier.glow})`
      }}
    >
      <path d="M -0.5,-0.5 C 14.5,-0.5 29.5,-0.5 44.5,-0.5C 44.1667,131.835 44.5,264.168 45.5,396.5C 73.4471,383.534 99.7804,368.034 124.5,350C 155.938,326.575 185.605,300.908 213.5,273C 214.332,272.312 214.998,272.479 215.5,273.5C 218.304,279.608 220.971,285.775 223.5,292C 174.074,344.044 117.408,386.377 53.5,419C 37.0594,426.088 20.3927,432.254 3.5,437.5C 2.16667,437.5 0.833333,437.5 -0.5,437.5C -0.5,291.5 -0.5,145.5 -0.5,-0.5 Z"/>
      <path d="M 84.5,-0.5 C 95.8333,-0.5 107.167,-0.5 118.5,-0.5C 148.318,1.27235 174.651,11.7723 197.5,31C 209.429,43.6841 219.262,57.8508 227,73.5C 233.272,85.7109 239.272,98.0442 245,110.5C 279.556,191.498 314.889,272.165 351,352.5C 357.118,366.618 366.784,377.618 380,385.5C 380.667,308.5 380.667,231.5 380,154.5C 357.934,172.23 337.434,191.73 318.5,213C 317.517,213.591 316.85,213.257 316.5,212C 313.597,205.125 310.597,198.292 307.5,191.5C 342.471,154.006 381.138,121.173 423.5,93C 424.448,92.5172 425.448,92.3505 426.5,92.5C 426.5,207.5 426.5,322.5 426.5,437.5C 414.167,437.5 401.833,437.5 389.5,437.5C 341.704,433.695 307.204,410.361 286,367.5C 278.395,352.623 271.061,337.623 264,322.5C 231.492,245.816 198.158,169.482 164,93.5C 158.435,79.5224 150.269,67.3557 139.5,57C 136.582,55.2912 133.748,53.4579 131,51.5C 130.333,128.833 130.333,206.167 131,283.5C 152.828,265.483 173.328,245.983 192.5,225C 193.332,224.312 193.998,224.479 194.5,225.5C 197.637,232.275 200.637,239.108 203.5,246C 167.875,283.973 128.375,317.14 85,345.5C 84.5,230.167 84.3333,114.834 84.5,-0.5 Z"/>
      <path d="M 508.5,-0.5 C 509.5,-0.5 510.5,-0.5 511.5,-0.5C 511.5,145.5 511.5,291.5 511.5,437.5C 496.5,437.5 481.5,437.5 466.5,437.5C 466.667,305.166 466.5,172.833 466,40.5C 437.363,53.5119 410.53,69.3452 385.5,88C 354.294,111.31 324.96,136.977 297.5,165C 296.517,165.591 295.85,165.257 295.5,164C 292.638,157.748 289.972,151.415 287.5,145C 338.501,91.9917 396.834,48.9917 462.5,16C 477.611,9.57643 492.945,4.07643 508.5,-0.5 Z"/>
    </svg>
  );

  return (
    <div className="group/nplus relative inline-flex items-center justify-center cursor-help ml-1.5 align-middle">
      {/* Glow effect on hover */}
      <div className={`absolute inset-0 ${tier.bgGlow} blur-sm rounded-full scale-150 opacity-0 group-hover/nplus:opacity-100 transition-opacity duration-300`} />
      
      {/* Base Icon */}
      <BadgeSVG className={`${className} relative z-10 transition-transform duration-300 group-hover/nplus:scale-110`} />
      
      {/* Discord Nitro Style Popover Tooltip */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 p-4 bg-[#111214]/95 backdrop-blur-md rounded-xl opacity-0 group-hover/nplus:opacity-100 transition-all duration-300 -translate-y-2 group-hover/nplus:translate-y-0 pointer-events-none border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.8)] z-[9999] w-48 text-center flex flex-col items-center gap-3">
        {/* Notch */}
        <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#111214]/95 border-l border-t border-white/10 rotate-45" />
        
        {/* Large SVG Avatar inside popover */}
        <div className="w-16 h-16 relative flex items-center justify-center mb-1">
          <div className={`absolute inset-0 ${tier.bgGlow} blur-xl rounded-full opacity-60`} />
          <BadgeSVG className="w-12 h-12 relative z-10" />
        </div>

        <div className="space-y-1 w-full">
          <h4 className="font-black italic uppercase tracking-widest text-[13px] leading-tight" style={{ color: tier.color, textShadow: `0 0 10px ${tier.glow}` }}>
            {tier.name.split(' ')[0]}<br/>{tier.name.split(' ')[1]}
          </h4>
          <p className="text-[#a1a1aa] text-[11px] font-medium mt-2">
            Subscriber since {tier.date}
          </p>
        </div>
      </div>
    </div>
  );
}
