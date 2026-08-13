export interface Scratch100xData {
  winningNumbers: number[];
  yourNumbers: {
    symbol: number | "STAR" | "100X";
    prize: number;
    isMatch: boolean;
  }[];
}

const FAKE_PRIZES = [400, 1000, 2000, 5000, 10000, 20000, 50000, 100000];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generate100xTicket(prizeWon: number): Scratch100xData {
  const winningNumbers: number[] = [];
  while (winningNumbers.length < 4) {
    const num = getRandomInt(1, 99);
    if (!winningNumbers.includes(num)) {
      winningNumbers.push(num);
    }
  }

  const yourNumbers: Scratch100xData["yourNumbers"] = [];
  
  if (prizeWon === 0) {
    // Kalah mutlak: isi grid dengan angka zonk
    for (let i = 0; i < 15; i++) {
      let num = getRandomInt(1, 99);
      while (winningNumbers.includes(num)) {
        num = getRandomInt(1, 99); // Pastikan bukan winning number
      }
      yourNumbers.push({
        symbol: num,
        prize: FAKE_PRIZES[Math.floor(Math.random() * FAKE_PRIZES.length)],
        isMatch: false,
      });
    }
  } else {
    // Menang: kita buat 1 slot kemenangan saja agar gampang
    // Tentukan tipe kemenangan: 0 = Match Angka, 1 = STAR, 2 = 100X
    let winType = 0; 
    const r = Math.random();
    if (r < 0.3) winType = 1; // 30% chance pakai STAR
    else if (r < 0.4 && prizeWon >= 10000 && prizeWon % 100 === 0) winType = 2; // 10% chance pakai 100X (Hanya jackpot besar)

    const winIndex = getRandomInt(0, 14);

    for (let i = 0; i < 15; i++) {
      if (i === winIndex) {
        if (winType === 1) {
          yourNumbers.push({ symbol: "STAR", prize: prizeWon, isMatch: true });
        } else if (winType === 2) {
          yourNumbers.push({ symbol: "100X", prize: prizeWon / 100, isMatch: true });
        } else {
          yourNumbers.push({ symbol: winningNumbers[0], prize: prizeWon, isMatch: true });
        }
      } else {
        let num = getRandomInt(1, 99);
        while (winningNumbers.includes(num)) {
          num = getRandomInt(1, 99); // Pastikan bukan winning number
        }
        yourNumbers.push({
          symbol: num,
          prize: FAKE_PRIZES[Math.floor(Math.random() * FAKE_PRIZES.length)],
          isMatch: false,
        });
      }
    }
  }

  return { winningNumbers, yourNumbers };
}
