FROM nginx:stable-alpine

ARG CACHEBUST=1

RUN rm -rf /usr/share/nginx/html/*

COPY *.html /usr/share/nginx/html/

RUN ls /usr/share/nginx/html/*.html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
