import styled from "styled-components";

type StyledPaintProps = {
  $loaded: boolean;
};

const StyledPaint = styled.div<StyledPaintProps>`
  iframe {
    opacity: ${({ $loaded }) => ($loaded ? "100%" : "0%")};
    transition: opacity 0.25s ease-in;
  }

  .paint-fallback {
    align-items: center;
    color: #fff;
    display: flex;
    flex-direction: column;
    gap: 14px;
    height: 100%;
    justify-content: center;
    padding: 24px;
    text-align: center;

    a {
      color: #cbe3ff;
      text-decoration: underline;
    }
  }

  .loading {
    &::before {
      color: #fff;
      font-weight: 500;
      mix-blend-mode: normal;
      text-shadow: 1px 2px 3px rgb(0 0 0 / 50%);
    }
  }
`;

export default StyledPaint;
