import { Component, OnInit } from '@angular/core';
import { Client, IStompSocket } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Message } from './models/message';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  imports: [FormsModule, CommonModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent implements OnInit{
  private client!: Client;
  conectado: boolean = false;
  message: Message = new Message();
  messages: Message[] = [];
  writing: string = '';
  clientId!: string;

  constructor() {
    this.clientId = 'id-' + new Date().getUTCMilliseconds() + '-' + Math.random().toString(36);
  }

  ngOnInit(): void {
      this.client = new Client();
      this.client.webSocketFactory = () => {
        return new SockJS("http://localhost:8080/chat-websocket") as IStompSocket;
      }

      this.client.onConnect = (frame) => {
        console.log('Conectados: ' + this.client.connected + ' : ' + frame);
        this.conectado = true;

        this.client.subscribe('/chat/message', e => {
          let message: Message = JSON.parse(e.body) as Message;
          message.dateMessage = new Date(message.dateMessage);
          if(!this.message.color && message.type == 'NEW_USER' && this.message.username == message.username) {
            this.message.color = message.color;
          }
          this.messages.push(message);
          console.log(message);
        });
        this.client.subscribe('/chat/write', e => {
          this.writing = e.body;

          setTimeout(() => this.writing = '', 3000);
        });

        this.client.subscribe('chat/history/' + this.clientId, e => {
          const history = JSON.parse(e.body) as Message[];
          this.messages = history.map(m => {
            m.dateMessage = new Date(m.dateMessage);
            return m;
          }).reverse();
        });

        this.client.publish({destination: '/app/history', body: this.clientId});

        this.message.type = 'NEW_USER';
        this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
      }

      this.client.onDisconnect= (frame) => {
        console.log('Desconectados: ' + !this.client.connected + ' : ' + frame);
        this.conectado = false;
        this.message = new Message();
        this.messages = [];
      }
  }

  conectar():void {
    this.client.activate();
  }

  desconectar():void {
    this.client.deactivate();
  }

  sendMessage(): void {
    this.message.type = 'MESSAGE';
    this.client.publish({destination: '/app/message', body: JSON.stringify(this.message)});
    this.message.text = '';
  }

  writeEvent():void {
    this.client.publish({destination: '/app/write', body: this.message.username});
  }

}
