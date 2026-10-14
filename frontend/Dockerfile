# Production Frontend Dockerfile (Nginx Reverse Proxy)
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy custom reverse-proxy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend static build assets
COPY public/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
