
Some web toys. 

Primarily, intended as a space for imperfect, experimental, and exploratory web toys - ones that aren't overthought or over-engineered, but plant a little idea on the web. Many of these are 'vibes-based' coding with lots of Claude or Cursor use.

## Development Notes

### Creating Boomerang Background Videos
To create a boomerang effect for background videos on the main page:

```bash
ffmpeg -i input.mp4 -filter_complex "[0:v]reverse[r];[0:v][r]concat=n=2:v=1[v]" -map "[v]" -c:v libx264 -crf 23 output.mp4
```

