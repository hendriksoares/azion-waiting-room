/* eslint-disable prettier/prettier */

export const mainPageTemplate = (date: Date) => {
  return `
    <html>
      <script>
        const interval = 
          setInterval(() => {
            const distance = ${date.getTime()} - new Date().getTime();
            if (distance < 0) {
              clearInterval(x);
              document.getElementById("timer").innerHTML = "EXPIRED";
            } else {
              const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
              const seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
              document.getElementById("timer").innerHTML = minutes + "m " + seconds + "s ";
            }
          }, 1000 );

      </script>
      <body>
        <h2> 
          Main page ! Session Time  <span id="timer"> ... </span>
        </h2>
      </body>
    </html>
  `;
};
