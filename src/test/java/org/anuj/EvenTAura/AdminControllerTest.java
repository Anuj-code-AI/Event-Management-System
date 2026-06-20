package org.anuj.EvenTAura;

import org.anuj.EvenTAura.controller.AdminController;
import org.anuj.EvenTAura.dto.UniversityRequest;
import org.anuj.EvenTAura.dto.UniversityResponse;
import org.anuj.EvenTAura.service.CloudinaryService;
import org.anuj.EvenTAura.service.UniversityService;
import org.anuj.EvenTAura.service.UserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CloudinaryService cloudinaryService;

    @MockBean
    private UniversityService universityService;

    @MockBean
    private UserService userService;

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    public void testAddUniversity() throws Exception {
        mockMvc.perform(post("/api/v1/admin/university")
                .param("name", "Test Univ")
                .param("domain", "test.edu"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    public void testUpdateUniversity() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/university/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Updated Name\",\"domain\":\"updated.edu\"}"))
                .andDo(print())
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "SUPER_ADMIN")
    public void testDeleteUniversity() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/university/1"))
                .andDo(print())
                .andExpect(status().isOk());
    }
}
