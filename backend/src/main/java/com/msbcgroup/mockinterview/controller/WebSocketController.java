package com.msbcgroup.mockinterview.controller;

import com.msbcgroup.mockinterview.model.MonitoringEvent;
import com.msbcgroup.mockinterview.repository.MonitoringEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class WebSocketController {

    @Autowired
    private MonitoringEventRepository eventRepository;

    @MessageMapping("/monitoring")
    @SendTo("/topic/monitoring")
    public Map<String,Object> handleMonitoringEvent(Map<String,Object> eventData) {
        // Process the incoming event data
        // For example, save it to the database
        MonitoringEvent event = new MonitoringEvent();
        event.setSessionId((String) eventData.get("sessionId"));
        event.setCandidateEmail((String) eventData.get("candidateEmail"));
        event.setEventType(MonitoringEvent.EventType.valueOf((String) eventData.get("eventType")));
        event.setDescription((String) eventData.get("description"));
        event.setMetadata((String) eventData.get("metadata"));

        eventRepository.save(event);

        return eventData;
    }

}
