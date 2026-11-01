import { compactDesktopIconPositions } from "utils/compactDesktopIconPositions";

const desktop = "/Users/Public/Desktop";
const files = ["My PC.url", "Public.url", "About Me.url", "DOOM.url", "Life.url", "Resume.url", "Tennis.url"];
const key = (name: string): string => `${desktop}/${name}`;
const slot = (row: number, col = 1) => ({
  gridColumnStart: col,
  gridRowStart: row,
});

describe("desktop icon layout after removing shortcuts", () => {
  it("removes the empty Blogs slot and packs DOOM, Life, Resume, and Tennis", () => {
    const positions = {
      [key("My PC.url")]: slot(1),
      [key("Public.url")]: slot(2),
      [key("About Me.url")]: slot(3),
      [key("Blogs.url")]: slot(4),
      [key("DOOM.url")]: slot(5),
      [key("Life.url")]: slot(6),
      [key("Resume.url")]: slot(7),
      [key("Tennis.url")]: slot(8),
      "/other/folder/file": slot(3),
    };
    const result = compactDesktopIconPositions(desktop, files, positions, 8);

    expect(result[key("Blogs.url")]).toBeUndefined();
    expect(result[key("DOOM.url")]).toEqual(slot(4));
    expect(result[key("Life.url")]).toEqual(slot(5));
    expect(result[key("Resume.url")]).toEqual(slot(6));
    expect(result[key("Tennis.url")]).toEqual(slot(7));
    expect(result["/other/folder/file"]).toEqual(slot(3));
  });

  it("wraps to the next column on shorter screens", () => {
    const positions = Object.fromEntries(
      files.map((name, index) => [key(name), slot(index + 1)])
    );
    const result = compactDesktopIconPositions(desktop, files, positions, 4);

    expect(result[key("DOOM.url")]).toEqual(slot(4));
    expect(result[key("Life.url")]).toEqual(slot(1, 2));
    expect(result[key("Tennis.url")]).toEqual(slot(3, 2));
  });

  it("preserves manually arranged multi-column positions", () => {
    const positions = {
      [key("My PC.url")]: slot(1),
      [key("Public.url")]: slot(2),
      [key("DOOM.url")]: slot(3, 2),
      [key("Blogs.url")]: slot(3),
    };
    const result = compactDesktopIconPositions(
      desktop,
      ["My PC.url", "Public.url", "DOOM.url"],
      positions,
      8
    );

    expect(result[key("DOOM.url")]).toEqual(slot(3, 2));
    expect(result[key("Blogs.url")]).toBeUndefined();
  });

  it("leaves a fresh session without stored positions to CSS auto-layout", () => {
    expect(compactDesktopIconPositions(desktop, files, {}, 8)).toEqual({});
  });
});
