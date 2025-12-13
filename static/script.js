const Hangul = {
    CHO: ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],
    JUNG: ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"],
    JONG: ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"],

    // 1. 한글 자소 분리 함수
    decompose: function(text) {
        let result = "";
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i);
            if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
                const code = charCode - 0xAC00;
                const jongIndex = code % 28;
                const jungIndex = Math.floor(code / 28) % 21;
                const choIndex = Math.floor(code / 28 / 21);

                result += this.CHO[choIndex] + this.JUNG[jungIndex];
                if (jongIndex > 0) result += this.JONG[jongIndex];
            } else {
                result += text[i]; 
            }
        }
        return result;
    },

    // 2. 검색용 키 생성 헬퍼 (공백 제거 + 소문자 + 자소 분리 통합)
    makeSearchKey: function(text) {
        if (!text) return "";
        return this.decompose(text.replace(/\s+/g, '').toLowerCase());
    }
};